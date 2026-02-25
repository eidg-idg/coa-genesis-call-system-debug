@isTest
private class Test_GC_HCPPageController {

    private static void setupTriggerSettings() {
        List<UST_EPLUS__TriggerSettings__c> settings = new List<UST_EPLUS__TriggerSettings__c>{
            new UST_EPLUS__TriggerSettings__c(Name='AllTrigger', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='EPAccountTrigger', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='EPCaseTrigger', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='EPHealthcareProviderTrigger', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='EPUserTrigger', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='TriggerOnLead', UST_EPLUS__RunTrigger__c=true),
            new UST_EPLUS__TriggerSettings__c(Name='EmailMessageHelperTrigger', UST_EPLUS__RunTrigger__c=true)
        };
        insert settings;
    }

    
    private static HealthcareProvider createTestHealthcareProvider() {
    // Assuming some default values for the fields
    HealthcareProvider hcp = new HealthcareProvider(
        Name='Test Provider',
        UST_EPLUS__Provider_ID__c='12345',
        UST_EPLUS__Provider_Tax_ID__c='67890',
        UST_EPLUS__Provider_NPI__c='ABCDE',
        UST_EPLUS__Provider_Status__c='Active',
        UST_EPLUS__Practice_Street_Address__c='123 Main St',
        UST_EPLUS__Practice_City__c='Anytown',
        UST_EPLUS__Practice_State__c='Anystate',
        UST_EPLUS__Practice_ZIP_Code__c='12345',
        UST_EPLUS__Primary_Phone_Number__c='555-555-5555'
    );
    insert hcp;
    return hcp;
}

    
    static testMethod void testControllerWithValidIds() {
        setupTriggerSettings();
        HealthcareProvider testHCP1 = createTestHealthcareProvider();
        HealthcareProvider testHCP2 = createTestHealthcareProvider(); // Additional test data

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        List<Id> ids = new List<Id>{testHCP1.Id, testHCP2.Id};
        String idsJson = JSON.serialize(ids);
        ApexPages.currentPage().getParameters().put('ids', idsJson);

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertNotEquals(null, controller.fetchedRecords, 'fetchedRecords should not be null');
        System.assertEquals(2, controller.fetchedRecords.size(), 'There should be two fetched records');
        System.assertEquals(testHCP1.Id, controller.fetchedRecords[0].Id, 'The first record ID should match');
        System.assertEquals(testHCP2.Id, controller.fetchedRecords[1].Id, 'The second record ID should match');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should not be null');
        System.assert(controller.fetchedRecordsJson.contains(testHCP1.Id), 'JSON should contain the first HCP ID');
        System.assert(controller.fetchedRecordsJson.contains(testHCP2.Id), 'JSON should contain the second HCP ID');
    }

    static testMethod void testControllerWithNoIds() {
        setupTriggerSettings();

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(new List<Id>()));

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertEquals(0, controller.fetchedRecords.size(), 'fetchedRecords should be empty');
        System.assertEquals('[]', controller.fetchedRecordsJson, 'Serialized JSON should be an empty array');
    }

    @isTest
    static void testControllerWithANI() {
        setupTriggerSettings();
        HealthcareProvider testHCP = createTestHealthcareProvider();

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        List<Id> ids = new List<Id>{testHCP.Id};
        ApexPages.currentPage().getParameters().put('ids', JSON.serialize(ids));
        ApexPages.currentPage().getParameters().put('ani', '7205559876');

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertEquals(1, controller.fetchedRecords.size(), 'Should fetch one record.');
        System.assertEquals('7205559876', controller.callerANI, 'ANI should be captured from URL parameter.');
    }

    @isTest
    static void testControllerWithMalformedIds() {
        setupTriggerSettings();

        Test.setCurrentPage(Page.VerifyHealthcareProviderVisualforcePage);
        ApexPages.currentPage().getParameters().put('ids', 'invalid-json-data');

        GC_HealthcareProvider_PageController controller = new GC_HealthcareProvider_PageController();

        System.assertEquals(0, controller.fetchedRecords.size(), 'Should handle malformed JSON gracefully.');
        System.assertNotEquals(null, controller.fetchedRecordsJson, 'Serialized JSON should still not be null.');
    }
}