Feature: Session lifecycle and integrity

  Scenario: App starts disconnected
    Given the app has just launched
    When the initial screen is shown
    Then the app should be in the disconnected setup state

  Scenario: Selected profile defines nominal workout structure
    Given a profile is marked as the Selected Profile
    When the user prepares a new session
    Then the nominal workout structure should come from the Selected Profile

  Scenario: User may adjust Actual Work Duration without mutating the profile
    Given a Selected Profile exists
    When the user changes Actual Work Duration on Home
    Then the session should use the adjusted Actual Work Duration
    And the profile timing definition should remain unchanged

  Scenario: Work-duration reduction is compensated in recovery
    Given a profile nominal work period is 30 seconds
    When the athlete chooses an Actual Work Duration of 20 seconds
    Then each round should preserve its total round duration
    And recovery durations should absorb the 10 second difference

  Scenario: Running session advances through all phases
    Given a workout session is running
    When the session progresses normally
    Then it should advance through Warmup
    And alternating work and recovery rounds
    And Cooldown

  Scenario: Paused session can be resumed
    Given a workout session is paused
    When the user resumes the session
    Then the session should continue from the same point

  Scenario: Completed session remains inspectable
    Given a workout session has completed
    When the user inspects the completed session
    Then the timer should remain at zero
    And BPM should remain visible
    And the graph should stop updating
    And the session should remain scrub-able

  Scenario: Ending early makes a session comparison-ineligible
    Given a session is in progress
    When the user ends the session early
    Then the session should be stored as ended early
    And it should not be comparison-eligible

  Scenario: Connection loss compromises a session
    Given a session is active
    When heart-rate connection is lost
    Then the session should become compromised
    And missing heart-rate regions should be persisted as gaps
    And the session should not be comparison-eligible

  Scenario: Implausible BPM outliers are ignored
    Given a session is active
    When an implausible BPM outlier is received
    Then it should not affect session state
    And it should not affect persisted samples
    And it should not distort chart scaling
