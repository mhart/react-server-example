var http = require('http'),
    browserify = require('browserify'),
    literalify = require('literalify'),
    React = require('react'),
    DOM = React.DOM, body = DOM.body, div = DOM.div, script = DOM.script,
    // This is our React component, shared by server and browser thanks to browserify
    App = React.createFactory(require('./App'))


// Just create a plain old HTTP server that responds to two endpoints ('/' and
// '/bundle.js') This would obviously work similarly with any higher level
// library (Express, etc)
http.createServer(function(req, res) {

  // If we hit the homepage, then we want to serve up some HTML - including the
  // server-side rendered React component(s), as well as the script tags
  // pointing to the client-side code
  if (req.url == '/') {

    res.setHeader('Content-Type', 'text/html')

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
        'Item </script>',
        'Item <!--inject!-->',
      ]
    }

    // Here we're using React to render the whole page, so we just use the
    // simpler renderToStaticMarkup function, but you could use any templating
    // language (or just a string) for the outer page template
    var html = React.renderToStaticMarkup(body(null,

      // The actual server-side rendering of our component occurs here, and we
      // pass our data in as `props`. This div is the same one that the client
      // will "render" into on the browser in the script tag below
      div({id: 'content', dangerouslySetInnerHTML: {
        __html: React.renderToString(App(props))
      }}),

      // We'll load React from a CDN - you don't have to do this,
      // you can bundle it up or serve it locally if you like
      script({src: '//fb.me/react-0.13.0.min.js'}),

      // Then the browser will fetch the browserified bundle, which we serve
      // from the endpoint further down. This exposes our component so it can be
      // referenced from the next script block
      script({src: '/bundle.js'}),

      // This script renders the component in the browser, referencing it from
      // the browserified bundle, using the same props we used in
      // renderToString above. We could have used a window-level variable, or
      // even a JSON-typed script tag, but this option is safe from namespacing
      // and injection issues, and doesn't require parsing
      script({dangerouslySetInnerHTML: {
        __html:
          'var App = React.createFactory(require("./App"));' +
          'React.render(App(' + safeStringify(props) + '),' +
            'document.getElementById("content"))'
      }})
    ))

    // Return the page to the browser
    res.end(html)

  // This endpoint is hit when the browser is requesting bundle.js from the page above
  } else if (req.url == '/bundle.js') {

    res.setHeader('Content-Type', 'text/javascript')

    // Here we invoke browserify to package up our component.
    // DON'T do it on the fly like this in production - it's very costly -
    // either compile the bundle ahead of time, or use some smarter middleware
    // (eg browserify-middleware).
    // We also use literalify to transform our `require` statements for React
    // so that it uses the global variable (from the CDN JS file) instead of
    // bundling it up with everything else
    browserify()
      .require('./App')
      .transform({global: true}, literalify.configure({react: 'window.React'}))
      .bundle()
      .pipe(res)

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
  return JSON.stringify(obj).replace(/<\/script/g, '<\\/script').replace(/<!--/g, '<\\!--')
}
