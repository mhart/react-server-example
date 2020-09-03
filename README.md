react-server-example
--------------------

A simple (no compile) example of how to do server-side rendering with the
[React](http://facebook.github.io/react/) library so that component code can be
shared between server and browser, as well as getting fast initial page loads
and search-engine-friendly pages.

A more complex example with shared routing and data fetching can be found at
[react-server-routing-example](https://github.com/mhart/react-server-routing-example).

A more complex example written in TypeScript can be found at [react-server-example-tsx](https://github.com/styfle/react-server-example-tsx).

Example
-------

```sh
$ npm install
$ node server.js
```

Then navigate to [http://localhost:3000](http://localhost:3000) and
click on the button to see some reactive events in action.

Try viewing the page source to ensure the HTML being sent from the server is already rendered
(with checksums to determine whether client-side rendering is necessary)

Here are the files involved:

`App.js`:
```js
var createReactClass = require('create-react-class')
var DOM = require('react-dom-factories')
var div = DOM.div, button = DOM.button, ul = DOM.ul, li = DOM.li

// This is just a simple example of a component that can be rendered on both
// the server and browser

module.exports = createReactClass({

  // We initialise its state by using the `props` that were passed in when it
  // was first rendered. We also want the button to be disabled until the
  // component has fully mounted on the DOM
  getInitialState: function() {
    return {items: this.props.items, disabled: true}
  },

  // Once the component has been mounted, we can enable the button
  componentDidMount: function() {
    this.setState({disabled: false})
  },

  // Then we just update the state whenever its clicked by adding a new item to
  // the list - but you could imagine this being updated with the results of
  // AJAX calls, etc
  handleClick: function() {
    this.setState({
      items: this.state.items.concat('Item ' + this.state.items.length),
    })
  },

  // For ease of illustration, we just use the React JS methods directly
  // (no JSX compilation needed)
  // Note that we allow the button to be disabled initially, and then enable it
  // when everything has loaded
  render: function() {

    return div(null,

      button({onClick: this.handleClick, disabled: this.state.disabled}, 'Add Item'),

      ul({children: this.state.items.map(function(item) {
        return li(null, item)
      })})

    )
  },
})
```

`browser.js`:
```js
var React = require('react')
var ReactDOM = require('react-dom')
// This is our React component, shared by server and browser thanks to browserify
var App = React.createFactory(require('./App'))

// This script will run in the browser and will render our component using the
// value from APP_PROPS that we generate inline in the page's html on the server.
// If these props match what is used in the server render, React will see that
// it doesn't need to generate any DOM and the page will load faster

ReactDOM.render(App(window.APP_PROPS), document.getElementById('content'))
```

`server.js`:
```js
var http = require('http')
var browserify = require('browserify')
var literalify = require('literalify')
var React = require('react')
var ReactDOMServer = require('react-dom/server')
var DOM = require('react-dom-factories')
var body = DOM.body, div = DOM.div, script = DOM.script
// This is our React component, shared by server and browser thanks to browserify
var App = React.createFactory(require('./App'))

// A variable to store our JS, which we create when /bundle.js is first requested
var BUNDLE = null

// Just create a plain old HTTP server that responds to two endpoints ('/' and
// '/bundle.js') This would obviously work similarly with any higher level
// library (Express, etc)
http.createServer(function(req, res) {

  // If we hit the homepage, then we want to serve up some HTML - including the
  // server-side rendered React component(s), as well as the script tags
  // pointing to the client-side code
  if (req.url === '/') {

    res.setHeader('Content-Type', 'text/html; charset=utf-8')

    // `props` represents the data to be passed in to the React component for
    // rendering - just as you would pass data, or expose variables in
    // templates such as Jade or Handlebars.  We just use some dummy data
    // here (with some potentially dangerous values for testing), but you could
    // imagine this would be objects typically fetched async from a DB,
    // filesystem or API, depending on the logged-in user, etc.
    var props = {
      items: [
        'Item 0',
        'Item 1',
        'Item </scRIpt>\u2028',
        'Item <!--inject!-->\u2029',
      ],
    }

    // Here we're using React to render the outer body, so we just use the
    // simpler renderToStaticMarkup function, but you could use any templating
    // language (or just a string) for the outer page template
    var html = ReactDOMServer.renderToStaticMarkup(body(null,

      // The actual server-side rendering of our component occurs here, and we
      // pass our data in as `props`. This div is the same one that the client
      // will "render" into on the browser from browser.js
      div({
        id: 'content',
        dangerouslySetInnerHTML: {__html: ReactDOMServer.renderToString(App(props))},
      }),

      // The props should match on the client and server, so we stringify them
      // on the page to be available for access by the code run in browser.js
      // You could use any var name here as long as it's unique
      script({
        dangerouslySetInnerHTML: {__html: 'var APP_PROPS = ' + safeStringify(props) + ';'},
      }),

      // We'll load React from a CDN - you don't have to do this,
      // you can bundle it up or serve it locally if you like
      script({src: 'https://cdn.jsdelivr.net/npm/react@16.13.1/umd/react.production.min.js'}),
      script({src: 'https://cdn.jsdelivr.net/npm/react-dom@16.13.1/umd/react-dom.production.min.js'}),
      script({src: 'https://cdn.jsdelivr.net/npm/react-dom-factories@1.0.2/index.min.js'}),
      script({src: 'https://cdn.jsdelivr.net/npm/create-react-class@15.6.3/create-react-class.min.js'}),

      // Then the browser will fetch and run the browserified bundle consisting
      // of browser.js and all its dependencies.
      // We serve this from the endpoint a few lines down.
      script({src: '/bundle.js'})
    ))

    // Return the page to the browser
    res.end(html)

  // This endpoint is hit when the browser is requesting bundle.js from the page above
  } else if (req.url === '/bundle.js') {

    res.setHeader('Content-Type', 'text/javascript')

    // If we've already bundled, send the cached result
    if (BUNDLE != null) {
      return res.end(BUNDLE)
    }

    // Otherwise, invoke browserify to package up browser.js and everything it requires.
    // We also use literalify to transform our `require` statements for React
    // so that it uses the global variable (from the CDN JS file) instead of
    // bundling it up with everything else
    browserify()
      .add('./browser.js')
      .transform(literalify.configure({
        'react': 'window.React',
        'react-dom': 'window.ReactDOM',
        'react-dom-factories': 'window.ReactDOMFactories',
        'create-react-class': 'window.createReactClass',
      }))
      .bundle(function(err, buf) {
        // Now we can cache the result and serve this up each time
        BUNDLE = buf
        res.statusCode = err ? 500 : 200
        res.end(err ? err.message : BUNDLE)
      })

  // Return 404 for all other requests
  } else {
    res.statusCode = 404
    res.end()
  }

// The http server listens on port 3000
}).listen(3000, function(err) {
  if (err) throw err
  console.log('Listening on 3000...')
})


// A utility function to safely escape JSON for embedding in a <script> tag
function safeStringify(obj) {
  return JSON.stringify(obj)
    .replace(/<\/(script)/ig, '<\\/$1')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028') // Only necessary if interpreting as JS, which we do
    .replace(/\u2029/g, '\\u2029') // Ditto
}
```
