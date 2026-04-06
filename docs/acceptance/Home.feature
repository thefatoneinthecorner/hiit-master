Feature: Home screen and workout start flow

  Scenario: App opens in the disconnected state
    Given the app has just launched
    And no heart-rate monitor is connected
    When the Home screen is displayed
    Then the user should see a single primary "Connect" call to action
    And the user should not see BPM
    And the user should not see Round
    And the user should not see Remaining
    And the screen should be visually sparse

  Scenario: Connected setup shows session-start controls
    Given a heart-rate monitor is connected
    And no session is active
    When the Home screen is displayed
    Then the primary call to action should be "Start"
    And live BPM should be visible
    And the selected profile name should be visible
    And an Actual Work Duration picker should be visible

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

  Scenario: Active session shows live runtime data
    Given a workout session is running
    When the Home screen is displayed
    Then the user should see the phase timer
    And the user should see BPM
    And the user should see Round
    And the user should see Remaining
    And the user should see the heart-rate graph
    And the user should see the recovery delta histogram

  Scenario: Heart graph scale starts from the selected profile nominal peak
    Given the selected profile has a nominal peak heartrate of 160 bpm
    And a workout session has started
    When the live heart graph is first displayed
    Then the graph vertical scale should initialize from 160 bpm

  Scenario: Completed session can be opened from the Home graphs
    Given a workout session has completed
    And the Home screen is showing the completed session
    When the user taps either graph
    Then the app should open the completed session in History

