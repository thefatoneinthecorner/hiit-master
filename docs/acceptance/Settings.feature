Feature: Settings and session profile management

  Scenario: Settings provides backup and restore actions
    Given the user opens the Settings screen
    Then the user should see an Import action
    And the user should see an Export action

  Scenario: App ships with a starter profile
    Given the app has been installed for the first time
    When the user opens Settings
    Then at least one profile should exist
    And a starter profile named "My Profile" should exist

  Scenario: One and only one selected profile exists
    Given multiple profiles exist
    When the user opens Settings
    Then exactly one profile should be marked as the Selected Profile

  Scenario: User can select a different profile for the next session
    Given multiple profiles exist
    When the user selects profile "Elliptical"
    Then "Elliptical" should become the Selected Profile
    And future sessions should use "Elliptical" by default

  Scenario: User can copy a profile
    Given a profile named "My Profile" exists
    When the user copies "My Profile"
    Then a new profile should be created
    And the new profile should have a unique name
    And the copied timing values should match the source profile

  Scenario: User can edit an unused profile timing definition
    Given a profile named "Running Machine" exists
    And no saved session references "Running Machine"
    When the user edits the timing values for "Running Machine"
    Then the timing changes should be saved

  Scenario: Referenced profiles have immutable timing fields
    Given a saved session references profile "My Profile"
    When the user opens the editor for "My Profile"
    Then timing fields should be read-only
    And name should remain editable
    And notes should remain editable

  Scenario: Athlete must clone or delete old sessions to change timing on a referenced profile
    Given a saved session references profile "My Profile"
    When the athlete wants to change the timing values for "My Profile"
    Then the athlete must either clone the profile or delete the old sessions that reference it

  Scenario: Renaming a profile updates stored session references
    Given saved sessions reference profile name "My Profile"
    When the user renames the profile to "Elliptical"
    Then the saved sessions should update their stored profile name to "Elliptical"

  Scenario: The last remaining profile cannot be deleted
    Given exactly one profile exists
    When the user attempts to delete it
    Then the delete action should be blocked

  Scenario: Recovery rows can be expanded and edited
    Given the user is editing a profile
    When the user taps a recovery-related row
    Then that row should expand
    And its controls should be revealed with a short animation

  Scenario: Warmup and cooldown cannot be cloned or deleted
    Given the user is editing a profile
    When the user expands Warmup or Cooldown
    Then only the stepper should be shown
    And clone and delete should not be available

  Scenario: Recovery rounds can be cloned and deleted
    Given the user is editing a profile
    And more than one recovery round exists
    When the user expands a recovery round
    Then clone and delete controls should be available

  Scenario: Cloning a recovery round inserts the copy immediately after the source round
    Given the user is editing a profile
    When the user clones "Round 3"
    Then the new round should be inserted immediately after "Round 3"

  Scenario: The last remaining recovery round cannot be deleted
    Given the user is editing a profile
    And only one recovery round remains between Warmup and Cooldown
    When the user attempts to delete that recovery round
    Then the delete action should be blocked

  Scenario: Stepper interaction supports tap and long press
    Given the user is editing a profile
    When the user taps a stepper control
    Then the value should change by 1 second
    When the user long-presses a stepper control
    Then the value should repeat in 5 second increments
    And repetition should stop immediately when the press is released

