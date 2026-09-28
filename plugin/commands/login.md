---
description: Authorize the silpo CLI with your Silpo account
disable-model-invocation: true
---

Run:

`silpo login`

This opens the authorization page in a browser and waits for the callback. The tokens are stored in
`~/.silpo/token.json`.

On a machine with no browser, print the URL instead and open it elsewhere:

`silpo login --no-browser`

If the callback port is taken, name another one:

`silpo login --port <port>`

Check who is signed in with:

`silpo me`

It names the account, or fails telling you to log in.

If tokens are already stored and still valid, `silpo login` reports that it is already authorized
and does nothing else. To authorize again anyway:

`silpo login --force`
