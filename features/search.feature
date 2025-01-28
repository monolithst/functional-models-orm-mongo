Feature: Search Features

  Scenario: A "find all" empty property search
    Given an orm is setup
    Given ModelList1 is created and inserted into the database
    When search named EmptySearch is executed on model named ModelA
    Then 10 instances are found

  Scenario: A property search with ors
    Given an orm is setup
    Given ModelList1 is created and inserted into the database
    When search named OrPropertySearch is executed on model named ModelA
    Then 3 instances are found

  Scenario: Text starts with search
    Given an orm is setup
    Given ModelList1 is created and inserted into the database
    When search named TextStartsWithPropertySearch is executed on model named ModelA
    Then 2 instances are found

  Scenario: Date span saerch
    Given an orm is setup
    Given ModelList1 is created and inserted into the database
    When search named DateSpanSearch is executed on model named ModelA
    Then 2 instances are found
