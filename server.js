var fs = require('fs'),
    http = require('http'),
    browserify = require('browserify'),
    literalify = require('literalify'),
    React = require('react'),
    // This is our React component, shared by server and browser thanks to browserify
    MyApp = React.createFactory(require('./myApp'))


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
    var myAppHtml = React.renderToString(MyApp(props))

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
      '<script src=/react.js></script>' +

      // Then the browser will fetch the browserified bundle, which we serve
      // from the endpoint further down. This exposes our component so it can be
      // referenced from the next script block
      '<script src=/bundle.js></script>' +

      // This script renders the component in the browser, referencing it
      // from the browserified bundle, using the same props we used to render
      // server-side. We could have used a window-level variable, or even a
      // JSON-typed script tag, but this option is safe from namespacing and
      // injection issues, and doesn't require parsing
      '<script>' +
        'var MyApp = React.createFactory(require("./myApp.js"));' +
        'React.render(MyApp(' + safeStringify(props) + '), document.getElementById("content"))' +
      '</script>'
    )

  // This endpoint is hit when the browser is requesting react.js from the page above
  } else if (req.url == '/react.js') {
        fs.readFile(__dirname + '/node_modules/react/dist/react.min.js', 'utf8', function(err, text){
            res.setHeader('Content-Type', 'text/javascript')
            res.end(text);
        });
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
      .transform(literalify.configure({react: 'window.React'}))
      .require('./myApp.js')
      .bundle()
      .pipe(res)

  // Return 404 for all other requests
  } else {
    res.statusCode = 404
    res.end()
  }

// The http server listens on port 3000
}).listen(3000)


// A utility function to safely escape JSON for embedding in a <script> tag
function safeStringify(obj) {
  return JSON.stringify(obj).replace(/<\/script/g, '<\\/script').replace(/<!--/g, '<\\!--')
}
