Feature: Settings and session profile management

  Scenario: Settings provides backup and restore actions
    Given the user opens the Settings screen
    Then the user should see an Import action
    And the user should see an Export action
    And no unrelated general-preferences controls should be visible

  Scenario: Settings may scroll vertically
    Given the user opens the Settings screen
    When the profile-management content exceeds the viewport height
    Then the Settings screen should allow vertical scrolling

  Scenario: App ships with a starter profile
    Given the app has been installed for the first time
    When the user opens Settings
    Then at least one profile should exist
    And a starter profile named "My Profile" should exist
    And the nominal work duration of "My Profile" should be 30 seconds
    And the warmup of "My Profile" should be 5 minutes
    And the cooldown of "My Profile" should be 3 minutes
    And the first five recovery rounds of "My Profile" should be 90, 75, 60, 45, and 35 seconds
    And the final seven recovery rounds of "My Profile" should each be 30 seconds

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
    And no unrelated helper panels should appear

  Scenario: The full width of a recovery row is tappable
    Given the user is editing a profile
    When the user taps the recovery row away from the text label
    Then that row should still expand

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

  Scenario: Switching profiles warns before discarding unsaved edits
    Given the user has unsaved amendments on the current profile
    When the user attempts to switch to a different profile
    Then the app should show a confirmation modal
    And the modal should explain that the unsaved amendments will be lost if the user continues
    And the user should be able to cancel and remain on the current profile with the draft edits intact
    And the user should be able to confirm discarding the draft and switch profiles

  Scenario: Settings remains limited to backup and profile management
    Given the user opens the Settings screen
    When the Settings UI is displayed
    Then only backup and session-profile management UI should be shown
    And no additional dashboards, coaching summaries, or unrelated preferences should be visible
