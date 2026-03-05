import React from 'react';

// TODO: Interactive Tutorial page
// Walk the user through the full game loop using fake/pre-recorded audio.
// Steps:
//   1. Intro — explain the concept ("You're going to hear a word spoken backwards")
//   2. Listen step — play a pre-recorded reversed audio clip of a known word (e.g. "apple")
//   3. Guess step — let the user type their guess; reveal the actual word after submitting
//   4. Record forwards step — have the user say the guessed word forwards (real mic, but not saved)
//   5. Record backwards step — have the user attempt to say it backwards (real mic, but not saved)
//   6. Outro — explain what happens next in a real game (share the link, next person guesses, etc.)
// The tutorial should not save anything to the backend.
// Use the same Step/Player/Record components as the real game for authenticity.

export default class Tutorial extends React.Component {
    render() {
        return (
            <div>
                <h2>Interactive Tutorial</h2>
                <p>Coming soon.</p>
            </div>
        );
    }
}
