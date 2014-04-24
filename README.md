# pewpew

## Toy synthesizer stolen from PuzzleScript, refactored, and lightly commented

The original code for this synthesizer comes from these three files in PuzzleScript:

*   https://github.com/increpare/PuzzleScript/blob/master/js/rng.js

*   https://github.com/increpare/PuzzleScript/blob/master/js/sfxr.js

*   https://github.com/increpare/PuzzleScript/blob/master/js/riffwave.js

I refactored it with the sole goal of making it nice to read.

Here it is: https://github.com/jorendorff/pewpew/blob/gh-pages/sfxr.js

Yes, the first thing you see is an implementation of RC4... it's not
a very secure synthesizer! ;-)

Caveats:

Some of my changes are probably bad for performance.
In particular, factoring the synthesizer into a pipeline
with many small steps means it creates a lot of temporary ArrayBuffers.
However, it does mean some steps can be skipped.
Perhaps somewhere there's a happy medium...

This is based on revision eb89ef22bb74 of increpare/PuzzleScript.
There have been a few changes since then.

