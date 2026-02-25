@isTest
private class TestMyScreenPopExtension7 {
    
    // Utility method to create test data for Account
    private static Account createTestAccount(String phone) {
        insertEPlusTriggerSettings();
        Account acc = new Account(Name='Test Account', Phone=phone);
        insert acc;
        return acc;
    }
    
    // Utility method to create test data for HealthcareProvider
    private static HealthcareProvider createTestHealthcareProvider(String phone) {
        insertEPlusTriggerSettings();
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
        HealthcareProvider hcp = new HealthcareProvider(Name='Test HealthcareProvider', UST_EPLUS__Primary_Phone_Number__c=phone, RecordTypeId = rt.Id);
        insert hcp;
        return hcp;
    }
    
    // Method to insert EPlus Trigger Settings
    private static void insertEPlusTriggerSettings() {
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

    @isTest
    static void testWithMultipleAccounts() {
        Account testAcc1 = createTestAccount('1234567890');
        Account testAcc2 = createTestAccount('1234567890'); // Same phone number

        MyScreenPopExtension7 extension = new MyScreenPopExtension7();
        String jsonData = '{"searchValue": "1234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when Accounts are found.');
        System.assert(result.contains(testAcc1.Id) && result.contains(testAcc2.Id), 'Result should contain both Account IDs.');
    }
    
    @isTest
    static void testWithHealthcareProvider() {
        HealthcareProvider testHCP = createTestHealthcareProvider('9876543210');

        MyScreenPopExtension7 extension = new MyScreenPopExtension7();
        String jsonData = '{"searchValue": "9876543210"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when a HealthcareProvider is found.');
        System.assert(result.contains(testHCP.Id), 'Result should contain the Healthcare Provider Id.');
    }

    @isTest
    static void testWithPrefixPlus1() {
        MyScreenPopExtension7 extension = new MyScreenPopExtension7();
        String jsonData = '{"searchValue": "+11234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
    }
    
    @isTest
    static void testNoMatch() {
        MyScreenPopExtension7 extension = new MyScreenPopExtension7();
        String jsonData = '{"searchValue": "noMatchValue"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop.');
    }
}