@isTest
private class Test_GC_Account_PageController {

    // Method to insert EPlus Trigger Avoidance Settings
    private static void insertEPlusTriggerSettings() {
        List<UST_EPLUS__TriggerSettings__c> settings = new List<UST_EPLUS__TriggerSettings__c>{
            new UST_EPLUS__TriggerSettings__c(Name='AllTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EPAccountTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EPCaseTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EPHealthcareProviderTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EPUserTrigger', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='TriggerOnLead', UST_EPLUS__RunTrigger__c=false),
            new UST_EPLUS__TriggerSettings__c(Name='EmailMessageHelperTrigger', UST_EPLUS__RunTrigger__c=false)
        };
        insert settings;
    }

    // Helper method to create test Account data
    static List<Id> createTestAccounts() {
        insertEPlusTriggerSettings();
        List<Account> accounts = new List<Account>{
            new Account(Name='Test Account 1', Phone='1234567890'),
            new Account(Name='Test Account 2', Phone='0987654321')
        };
        insert accounts;

        List<Id> accountIds = new List<Id>();
        for (Account acc : accounts) {
            accountIds.add(acc.Id);
        }
        return accountIds;
    }

    @isTest
    static void testControllerWithIds() {
        // Setting up test data
        List<Id> accountIds = createTestAccounts();
        
        // Mocking page parameters with serialized JSON of IDs
        Test.setCurrentPage(new PageReference('Page.dummyPage')); // Set a dummy PageReference
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(accountIds));
        
        // Instantiate the controller
        GC_Account_PageController controller = new GC_Account_PageController();
        
        // Assertions to check if the records are fetched correctly
        System.assertEquals(2, controller.fetchedRecords.size(), 'Should fetch exactly two records.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should not be null.');
    }
    
    @isTest
    static void testControllerWithoutIds() {
        // Mocking page parameters without IDs
        Test.setCurrentPage(new PageReference('Page.dummyPage')); // Set a dummy PageReference
        ApexPages.currentPage().getParameters().put('ids', null);
        
        // Instantiate the controller
        GC_Account_PageController controller = new GC_Account_PageController();
        
        // Assertions to check if no records are fetched and handled properly
        System.assertEquals(0, controller.fetchedRecords.size(), 'Should not fetch any records.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should still not be null.');
    }

    @isTest
    static void testControllerWithANI() {
        List<Id> accountIds = createTestAccounts();

        Test.setCurrentPage(new PageReference('Page.dummyPage'));
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(accountIds));
        ApexPages.currentPage().getParameters().put('ani', '3035551234');

        GC_Account_PageController controller = new GC_Account_PageController();

        System.assertEquals(2, controller.fetchedRecords.size(), 'Should fetch exactly two records.');
        System.assertEquals('3035551234', controller.callerANI, 'ANI should be captured from URL parameter.');
    }

    @isTest
    static void testControllerWithMalformedIds() {
        Test.setCurrentPage(new PageReference('Page.dummyPage'));
        ApexPages.currentPage().getParameters().put('ids', 'not-valid-json');

        GC_Account_PageController controller = new GC_Account_PageController();

        System.assertEquals(0, controller.fetchedRecords.size(), 'Should handle malformed JSON gracefully.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should still not be null.');
    }
}