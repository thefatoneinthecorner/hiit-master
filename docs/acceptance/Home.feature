Feature: Home screen and workout start flow

  Scenario: App opens in the disconnected state
    Given the app has just launched
    And no heart-rate monitor is connected
    When the Home screen is displayed
    Then the user should see a single primary "Connect" call to action
    And no other action buttons should be visible
    And the user should not see BPM
    And the user should not see Round
    And the user should not see Remaining
    And no session graphs should be visible
    And no additional helper cards or summary panels should be visible
    And the screen should be visually sparse
    And the screen should not require vertical scrolling

  Scenario: Connected setup shows session-start controls
    Given a heart-rate monitor is connected
    And no session is active
    When the Home screen is displayed
    Then the primary call to action should be "Start"
    And live BPM should be visible
    And the selected profile name should be visible
    And an Actual Work Duration picker should be visible
    And no session graphs should be visible
    And no recovery or history summary panels should be visible
    And the screen should not require vertical scrolling

  Scenario: Actual Work Duration defaults from the most recent session on the selected profile
    Given profile "My Profile" is the selected profile
    And there is a previous completed session recorded on "My Profile" with Actual Work Duration "23s"
    When the connected Home setup is displayed
    Then the Actual Work Duration should default to "23s"

  Scenario: Actual Work Duration defaults to two thirds of the nominal work duration of the selected profile when it has no prior sessions
    Given profile "My Profile" is the selected profile
    And the Norminal Work Duration of the "My Profile" profile is "30s"
    And there are no previous sessions recorded on "My Profile"
    When the connected Home setup is displayed
    Then the Actual Work Duration should default to "20s"

  Scenario: Starting a session enters countdown but immediately shows the session layout
    Given a heart-rate monitor is connected
    And the connected Home setup is displayed
    When the user taps "Start"
    Then the app should enter the startup countdown
    And the session layout should be visible before the countdown beeps finish
    And Round should be visible and set to "Warmup"
    And Remaining should be visible
    And the session graphs should be visible
    And the countdown should use the green rest styling
    And the "beep", "beep", "beep", "beeeeeeeep" audio cue should immediately play
    And no additional setup controls should remain visible

  Scenario: Startup countdown beeps use a one-second cadence and track the countdown display
    Given a heart-rate monitor is connected
    And the connected Home setup is displayed
    When the user taps "Start"
    Then the startup countdown should emit one countdown beep per second
    And the fourth countdown sound should be the long beep
    And the beep cadence should approximately match the visible countdown timer updates
    And the audio and visible countdown should not feel materially out of sync

  Scenario: Active session shows live runtime data
    Given a workout session is running
    When the Home screen is displayed
    Then the user should see the phase timer
    And the user should see BPM
    And the user should see Round
    And the user should see Remaining
    And the user should see the heart-rate graph
    And the user should see the recovery delta histogram
    And no unrelated helper cards or extra action buttons should be visible
    And the live session screen should not require vertical scrolling

  Scenario: Home remains non-scrolling in all main states
    Given the Home screen is shown in any of its documented main states
    When the user views that screen on the target mobile layout
    Then the screen should not require vertical scrolling

  Scenario: Heart graph scale starts from the selected profile nominal peak
    Given the selected profile has a nominal peak heartrate of 160 bpm
    And a workout session has started
    When the live heart graph is first displayed
    Then the graph vertical scale should initialize from 160 bpm

  Scenario: Heart graph plots heart rate against elapsed session time
    Given a workout session is running
    And heart-rate samples have been recorded at multiple elapsed times
    When the live heart graph is displayed
    Then the graph should plot the samples in elapsed-time order
    And the graph should not collapse the full session into a fixed small number of summary bars

  Scenario: Heart graph expands above the nominal peak when live BPM exceeds it
    Given the selected profile has a nominal peak heartrate of 160 bpm
    And a workout session is running
    And a live heart-rate sample of 171 bpm is received
    When the live heart graph updates
    Then the graph vertical scale should expand above 160 bpm
    And the expanded ceiling should use 10 bpm increments

  Scenario: Heart graph minimum follows the lowest observed session BPM
    Given a workout session is running
    And the live heart graph has already been displayed
    And a new lowest valid heart-rate sample is received
    When the live heart graph updates
    Then the graph minimum should adjust downward to include that sample

  Scenario: Heart graph updates as new live samples arrive
    Given a workout session is running
    And the live heart graph is visible
    When a new valid heart-rate sample is received
    Then the graph trace should extend or update to include the new sample

  Scenario: Heart graph freezes after session completion
    Given a workout session has completed
    And the completed Home screen is visible
    When additional live BPM changes occur after completion
    Then the heart graph should remain visually unchanged

  Scenario: Heart graph shows unlabeled gridlines at 50 bpm intervals
    Given a workout session has started
    When the live heart graph is displayed
    Then the graph should show gridlines at 50 bpm intervals
    And the gridlines should not be labeled

  Scenario: Completed session can be opened from the Home graphs
    Given a workout session has completed
    And the Home screen is showing the completed session
    When the user taps either graph
    Then the app should open the completed session in History
