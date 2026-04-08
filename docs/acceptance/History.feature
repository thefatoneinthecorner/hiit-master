Feature: History browsing and session inspection

  Scenario: No History is available
    Given there are no completed sessions in the app
    When the History toolbar action is visible
    Then the History action should be disabled

  Scenario: History shows the session name and profile name
    Given a completed session exists
    When the user opens that session in History
    Then the session date and time should be clearly visible
    And the session name should be derived from the session start date and time
    And the profile name used for that session should be shown separately
    And a trash icon should be visible in the header

  Scenario: History shows the session graphs
    Given a completed session exists
    When the user opens that session in History
    Then the heart graph should be visible
    And the recovery delta histogram should be visible
    And the heart graph axes should be labelled
    And no workout-start controls should be visible
    And no device-management controls should be visible

  Scenario: History still shows an empty histogram when no same-profile comparison session exists
    Given a completed session exists
    And there is no earlier eligible session recorded on the same profile
    When the user opens that session in History
    Then the recovery delta histogram should still be visible
    And the histogram should be empty

  Scenario: History may scroll vertically
    Given the user opens History
    When the historical inspection content exceeds the viewport height
    Then the History screen should allow vertical scrolling

  Scenario: History scrubber shows detailed point-in-time information
    Given a completed session exists
    And the session is open in History
    When the user moves the scrubber
    Then the selected round should update
    And the exact time should update
    And the BPM value should update
    And the round number should be available when scrubbing over histogram bars

  Scenario: History shows round, time, and BPM between the heart graph and histogram
    Given a completed session exists
    When the user opens that session in History
    Then the Round readout should appear immediately below the heart graph
    And the Time readout should appear immediately below the heart graph
    And the BPM readout should appear immediately below the heart graph
    And those readouts should appear above the recovery delta histogram

  Scenario: History shows selected-round stats below the histogram
    Given a completed session exists
    When the user opens that session in History
    Then the selected-round stats area should appear below the recovery delta histogram
    And it should display Peak
    And it should display Trough
    And it should display Delta
    And it should display Delta Diff when available
    And no additional analysis summary panels should be shown

  Scenario: History shows round data as a compact table
    Given a completed session exists
    When the user opens that session in History
    Then a compact round data table should be visible
    And the table should include "Round"
    And the table should include "Peak"
    And the table should include "Trough"
    And the table should include "Delta"
    And the table should include "Delta Diff"

  Scenario: Delta and Delta Diff are defined consistently
    Given a completed session exists
    When the session is shown in History
    Then Delta should mean Peak minus Trough for a round
    And Delta Diff should mean this session's Delta minus the same round's Delta from the most recent eligible previous session on the same profile

  Scenario: Mobile history navigation uses horizontal swipes
    Given multiple completed sessions exist
    And the user is on a mobile device
    When the user swipes horizontally in History
    Then the app should navigate to the adjacent session

  Scenario: Desktop history navigation uses chevrons
    Given multiple completed sessions exist
    And the user is on a desktop layout
    When the user clicks a history chevron
    Then the app should navigate to the adjacent session

  Scenario: User can delete a historical session
    Given a completed session exists
    When the user taps the trash icon for that session in History
    Then the session should be removed from stored history

  Scenario: History stays focused on historical inspection only
    Given the user opens History
    When the historical detail screen is displayed
    Then only historical browsing and inspection UI should be shown
    And no extra helper text or controls should be visible beyond the documented History workflow
