Feature: Devices screen and monitor management

  Scenario: Devices tab is unavailable before connection and before any session has started
    Given no heart-rate monitor is connected
    And no session has started
    When the tab bar is displayed
    Then the Devices tab should be disabled

  Scenario: Devices tab becomes available once a monitor is connected
    Given a heart-rate monitor is connected
    And no session is active
    When the tab bar is displayed
    Then the Devices tab should be enabled

  Scenario: Devices tab remains accessible during an active session
    Given a workout session is active
    When the tab bar is displayed
    Then the Devices tab should be enabled

  Scenario: Devices screen shows current device status
    Given a heart-rate monitor named "Polar OH1 36F91927" is connected
    And the battery level is available as 80 percent
    And the current BPM is 48
    When the user opens the Devices screen
    Then the device name should be visible
    And the battery card should be visible
    And the Live BPM card should be visible
    And "Reconnect" should be visible
    And "Disconnect" should be visible

  Scenario: Device test mode hardwires battery percentage
    Given device-test mode is enabled
    And the user opens the Devices screen
    Then the battery display should show 33 percent

  Scenario: Reconnect performs a fresh connection flow
    Given a heart-rate monitor is connected
    When the user taps "Reconnect" on the Devices screen
    Then the app should disconnect the current monitor
    And the app should start a fresh connection flow
    And the host OS Bluetooth picker may be shown

  Scenario: Disconnect compromises an active session
    Given a workout session is active
    And a heart-rate monitor is connected
    When the user taps "Disconnect" on the Devices screen
    Then the monitor connection should end
    And the session should be marked as compromised

  Scenario: Athlete can switch devices mid-session
    Given a workout session is paused
    And a heart-rate monitor is connected
    When the user opens the Devices screen
    And the user disconnects the current monitor
    And the user connects a different heart-rate monitor
    And the user returns to Home
    Then the session should still be resumable

