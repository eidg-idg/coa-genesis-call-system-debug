@isTest
private class TestMyScreenPopExtension5 {
    
    // Utility method to create test data for Account
    private static Account createTestAccount(String phone) {
        
        //EPlus Trigger Avoidance Settings:
        UST_EPLUS__TriggerSettings__c ts1 = new UST_EPLUS__TriggerSettings__c();
        
        ts1.Name = 'AllTrigger';
        
        ts1.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts2 = new UST_EPLUS__TriggerSettings__c();
        
        ts2.Name = 'EPAccountTrigger';
        
        ts2.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts3 = new UST_EPLUS__TriggerSettings__c();
        
        ts3.Name = 'EPCaseTrigger';
        
        ts3.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts4 = new UST_EPLUS__TriggerSettings__c();
        
        ts4.Name = 'EPHealthcareProviderTrigger';
        
        ts4.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts5 = new UST_EPLUS__TriggerSettings__c();
        
        ts5.Name = 'EPUserTrigger';
        
        ts5.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts6 = new UST_EPLUS__TriggerSettings__c();
        
        ts6.Name = 'TriggerOnLead';
        
        ts6.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts7 = new UST_EPLUS__TriggerSettings__c();
        
        ts7.Name = 'EmailMessageHelperTrigger';
        
        ts7.UST_EPLUS__RunTrigger__c = true;
        
         
        
        insert new List<UST_EPLUS__TriggerSettings__c> {ts1, ts2, ts3, ts4, ts5, ts6, ts7};
        
        Account acc = new Account(Name='Test Account', Phone=phone);
        insert acc;
        return acc;
    }
    
    // Utility method to create test data for HealthcareProvider
    private static HealthcareProvider createTestHealthcareProvider(String phone) {
        
        //EPlus Trigger Avoidance Settings:
        UST_EPLUS__TriggerSettings__c ts1 = new UST_EPLUS__TriggerSettings__c();
        
        ts1.Name = 'AllTrigger';
        
        ts1.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts2 = new UST_EPLUS__TriggerSettings__c();
        
        ts2.Name = 'EPAccountTrigger';
        
        ts2.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts3 = new UST_EPLUS__TriggerSettings__c();
        
        ts3.Name = 'EPCaseTrigger';
        
        ts3.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts4 = new UST_EPLUS__TriggerSettings__c();
        
        ts4.Name = 'EPHealthcareProviderTrigger';
        
        ts4.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts5 = new UST_EPLUS__TriggerSettings__c();
        
        ts5.Name = 'EPUserTrigger';
        
        ts5.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts6 = new UST_EPLUS__TriggerSettings__c();
        
        ts6.Name = 'TriggerOnLead';
        
        ts6.UST_EPLUS__RunTrigger__c = true;
        
         
        
        UST_EPLUS__TriggerSettings__c ts7 = new UST_EPLUS__TriggerSettings__c();
        
        ts7.Name = 'EmailMessageHelperTrigger';
        
        ts7.UST_EPLUS__RunTrigger__c = true;
        
         
        
        insert new List<UST_EPLUS__TriggerSettings__c> {ts1, ts2, ts3, ts4, ts5, ts6, ts7};
        
        //Query for RecordType Id
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
        //Assign to variable
        String recordTypeId = rt.Id;
        
        HealthcareProvider hcp = new HealthcareProvider(Name='Test HealthcareProvider', UST_EPLUS__Primary_Phone_Number__c=phone, RecordTypeId = recordTypeId);
        insert hcp;
        return hcp;
    }
    
    @isTest
    static void testWithAccount() {
        // Setup test data
        Account testAcc = createTestAccount('1234567890');
        
        // Instantiate the class and call the method
        MyScreenPopExtension5 extension = new MyScreenPopExtension5();
        String jsonData = '{"searchValue": "1234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        // Assertions
        System.assertNotEquals(null, result, 'Result should not be null when an Account is found.');
        System.assert(result.contains(testAcc.Id), 'Result should contain the Account Id.');
    }
    
    @isTest
    static void testWithHealthcareProvider() {
        // Setup test data
        HealthcareProvider testHCP = createTestHealthcareProvider('9876543210');
        
        // Instantiate the class and call the method
        MyScreenPopExtension5 extension = new MyScreenPopExtension5();
        String jsonData = '{"searchValue": "9876543210"}';
        String result = extension.onScreenPop(jsonData);
        
        // Assertions
        System.assertNotEquals(null, result, 'Result should not be null when a HealthcareProvider is found.');
        System.assert(result.contains(testHCP.Id), 'Result should contain the Healthcare Provider Id.');
    }
    
    @isTest
    static void testWithPrefixPlus1() {
        // Instantiate the class and call the method with +1 prefix
        MyScreenPopExtension5 extension = new MyScreenPopExtension5();
        String jsonData = '{"searchValue": "+11234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        // Assertions for default screen pop as no test data is created
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop.');
    }
    
    @isTest
    static void testNoMatch() {
        // Instantiate the class and call the method with a value that doesn't match any test data
        MyScreenPopExtension5 extension = new MyScreenPopExtension5();
        String jsonData = '{"searchValue": "noMatchValue"}';
        String result = extension.onScreenPop(jsonData);
        
        // Assertions for default screen pop
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop.');
    }
}