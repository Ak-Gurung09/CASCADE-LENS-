// The note in index.html tells someone who opened the file directly to use Start CascadeLens.bat. That only applies
// to file: pages, where browsers refuse to load the app's modules. On a web address (GitHub Pages, or the local
// server at localhost:8765) the app is simply still downloading, so this swaps the note for a plain loading message.
// A classic script, not a module, so it also runs from file: and leaves the original note in place there.
(function () {
  if (location.protocol === 'file:') return
  var note = document.querySelector('.boot-note')
  if (!note) return
  note.className = 'boot-note boot-loading'
  note.setAttribute('role', 'status')
  note.innerHTML = '<h1>Loading GAIA CascadeLens…</h1><p>The map and its satellite data are downloading. On a slow connection this can take a little while.</p>'
  // If the app has still not started, say what to try instead of waiting silently
  setTimeout(function () {
    var n = document.querySelector('.boot-loading')
    if (n) n.innerHTML = '<h1>GAIA CascadeLens is taking longer than usual</h1><p>The app has not finished loading. Check the internet connection, then reload the page. It needs a recent browser with WebGL, such as Chrome, Edge, Firefox or Safari.</p>'
  }, 30000)
})()
