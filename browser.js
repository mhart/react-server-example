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
