react-server-example
--------------------

A simple example of how to do server-side rendering with the [React](http://facebook.github.io/react/) library
so that component code can be shared between server and browser,
as well as getting fast initial page loads and search-engine-friendly pages.

Example
-------

```sh
$ node server.js
```

Then navigate to [http://localhost:3000](http://localhost:3000) and
click on the text to see some reactive events in action.

Also pop open the browser's Dev Tools to ensure that the HTML being sent from the server is already rendered
(with checksums to determine whether client-side rendering is necessary)

Here are the files involved:

`myApp.js`:
```js
var React = require('react')

// This is just a simple example of a component that can be rendered on both
// the server and browser

module.exports = React.createClass({

  // We initialise its state by using the `props` that were passed in when it
  // was first rendered
  getInitialState: function() {
    return {items: this.props.items}
  },

  // Then we just update the state whenever its clicked - but you could imagine
  // this being updated with the results of AJAX calls, etc
  handleClick: function() {
    this.setState({items: this.state.items.concat(this.state.items.length)})
  },

  // For ease of illustration, we just use the JS methods directly
  // (no JSX compilation needed)
  render: function() {
    return React.DOM.h1({onClick: this.handleClick}, 'Items: ' + this.state.items.join(', '))
  },
})
```

`server.js`:
```js
var http = require('http'),
    browserify = require('browserify'),
    literalify = require('literalify'),
    React = require('react'),
    // This is our React component, shared by server and browser thanks to browserify
    MyApp = require('./myApp')


// Just create a plain old HTTP server that responds to two endpoints ('/' and
// '/bundle.js') This would obviously work similarly with any higher level
// library (Express, etc)
http.createServer(function(req, res) {

  // If we hit the homepage, then we want to serve up some HTML - including the
  // server-side rendered React component(s), as well as the script tags
  // pointing to the client-side code
  if (req.url == '/') {

    // This represents our data to be passed in to the React component for
    // rendering - just as you would pass data, or expose variables in
    // templates such as Jade or Handlebars.  We just use an array of garbage
    // here (with some potentially dangerous values for testing), but you could
    // imagine this would be objects typically fetched async from a DB,
    // filesystem or API, depending on the logged-in user, etc.
    var props = {items: [0, 1, '</script>', '<!--inject!-->']}

    // Now that we've got our data, we can perform the server-side rendering by
    // passing it in as `props` to our React component - and returning an HTML
    // string to be sent to the browser
    var myAppHtml = React.renderComponentToString(MyApp(props))

    res.setHeader('Content-Type', 'text/html')

    // Now send our page content - this could obviously be constructed in
    // another template engine, or even as a top-level React component itself -
    // but easier here just to construct on the fly
    res.end(
      // <html>, <head> and <body> are for wusses

      // Include our static React-rendered HTML in our content div. This is
      // the same div we render the component to on the client side, and by
      // using the same initial data, we can ensure that the contents are the
      // same (React is smart enough to ensure no rendering will actually occur
      // on page load)
      '<div id=content>' + myAppHtml + '</div>' +

      // We'll load React from a CDN - you don't have to do this,
      // you can bundle it up or serve it locally if you like
      '<script src=//fb.me/react-0.9.0.min.js></script>' +

      // Ensure that our initial data is also accessible on the client-side by
      // embedding it here in the page. We could have used a window-level
      // variable, or even a JSON-typed script tag, but this option is safer
      // from namespacing and injection issues, and doesn't require parsing
      '<script>React.__myAppProps = ' + escapeJs(JSON.stringify(props)) + '</script>' +

      // Then the browser will fetch the client-side bundle, which we serve
      // from the endpoint below. This includes our component and our
      // initialisation code, which will render our component on the
      // client-side into the `content` div (essentially no DOM tree changes
      // will occur, but the events will all be wired up correctly)
      '<script src=/bundle.js></script>'
    )

  // This endpoint is hit when the browser is requesting bundle.js from the page above
  } else if (req.url == '/bundle.js') {

    res.setHeader('Content-Type', 'text/javascript')

    // Here we invoke browserify to package up our component and our
    // initialisation code.
    // DON'T do it on the fly like this in production - it's very costly -
    // either compile the bundle ahead of time, or use some smarter middleware
    // (eg browserify-middleware).
    // We also use literalify to transform our `require` statements for React
    // so that it uses the global variable (from the CDN JS file) instead of
    // bundling it up with everything else
    browserify()
      .transform(literalify.configure({react: 'window.React'}))
      .add('./browser.js')
      .bundle()
      .pipe(res)

  // Return 404 for all other requests
  } else {
    res.statusCode = 404
    res.end()
  }

// The http server listens on port 3000
}).listen(3000)


// A utility function to safely escape JavaScript/JSON for embedding in a <script> tag
function escapeJs(jsStr) {
  return jsStr.replace(/<\/script/g, '<\\/script').replace(/<!--/g, '<\\!--')
}
```

`browser.js`:
```js
var React = require('react'),
    MyApp = require('./myApp')

// This is bundled up and run when the browser requests '/bundle.js', so this
// is the entry point where we initialise our React component from the
// client (browser) side

// We had set the `React.__myAppProps` value using an inline script on the page
// populated from the server-side, so now pass that in to ensure that React
// comes up with the same result when it renders the component (you'll see a
// warning in the browser console if it fails to render the same result - in
// which case there may be something out of whack with the data you're
// initialising with in the browser vs the server)
React.renderComponent(MyApp(React.__myAppProps), document.getElementById('content'))
```
