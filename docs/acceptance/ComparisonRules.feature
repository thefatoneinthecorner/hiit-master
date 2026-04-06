Feature: Comparison and recovery rules

  Scenario: Comparison uses the most recent eligible session on the same profile
    Given the current session uses profile "My Profile"
    And multiple earlier sessions exist
    When comparison data is selected
    Then the app should choose the most recent earlier comparison-eligible session recorded on "My Profile"

  Scenario: Comparison excludes ineligible sessions
    Given earlier sessions exist on the same profile
    When the app searches for a comparison session
    Then it should exclude sessions that ended early
    And it should exclude sessions that were compromised
    And it should exclude sessions with incomplete heart-rate coverage

  Scenario: Recovery delta is derived from peak and trough
    Given a round has a measured peak and trough
    When the round is analyzed
    Then Delta should equal Peak minus Trough

  Scenario: Delta Diff compares current and previous delta for the same round
    Given the current session and the comparison session both have a delta for Round 4
    When diff delta is calculated
    Then Diff Delta should equal current delta minus previous delta

  Scenario: A round becomes visible by the next work phase by default
    Given a live session is in progress
    When a round has completed its recovery
    Then that round comparison should become visible no later than the start of the next work interval

  Scenario: A round can reveal earlier during recovery
    Given a live session is in progress
    And the live trace has crossed the threshold proving current delta will match or exceed the previous delta
    When that threshold is reached during recovery
    Then the round comparison should become visible immediately

  Scenario: Final round still produces a recovery metric
    Given the final round has completed work
    When the final round is analyzed
    Then the app should still produce a recovery delta
    And the app should not assume the existence of a following work interval

  Scenario: Final round still becomes visible
    Given the final round has no subsequent work interval
    When live comparison display timing is determined
    Then the app should use a final-round reveal heuristic
    And the final round comparison should not remain hidden indefinitely

  Scenario: Completed session scrubbing exposes comparison values
    Given a session has completed
    When the user scrubs through the completed session
    Then the user should be able to inspect current delta
    And the user should be able to inspect previous delta
    And the user should be able to inspect diff delta

