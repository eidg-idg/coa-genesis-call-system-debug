@isTest
private class TestGenesysCTIExtensionClassV2 {

    // Utility method to create test data for Account
    private static Account createTestAccount(String phone, String last4SSN) {
        insertEPlusTriggerSettings();
        Account acc = new Account(Name='Test Account', Phone=phone, Last_4_SSN_V2__c=last4SSN);
        insert acc;
        return acc;
    }
    
    // Utility method to create test data for HealthcareProvider
    private static HealthcareProvider createTestHealthcareProvider(String phone, String npi) {
        insertEPlusTriggerSettings();
        RecordType rt = [SELECT Id FROM RecordType WHERE SObjectType = 'HealthcareProvider' AND Name = 'Supplier Location' LIMIT 1];
        HealthcareProvider hcp = new HealthcareProvider(Name='Test HealthcareProvider', UST_EPLUS__Primary_Phone_Number__c=phone, UST_EPLUS__Provider_NPI__c=npi, RecordTypeId = rt.Id);
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
    static void testBothAccountMatches() {
        Account testAcc1 = createTestAccount('1234567890', '1234');
        Account testAcc2 = createTestAccount('1234567890', '1234'); // Same phone number and SSN

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"1234\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when Accounts are found.');
        System.assert(result.contains(testAcc1.Id) && result.contains(testAcc2.Id), 'Result should contain both Account IDs.');
    }

    @isTest
    static void testAccountSSNOnlyMatch() {
        Account testAcc = createTestAccount('0000000000', '5678'); // Different phone number but same SSN

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "9999999999", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"5678\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when SSN matches.');
        System.assert(result.contains(testAcc.Id), 'Result should contain the Account ID matching the SSN.');
    }

    @isTest
    static void testAccountPhoneOnlyMatch() {
        Account testAcc = createTestAccount('1122334455', '9999'); // Different SSN but same phone number

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1122334455", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"0000\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when phone matches.');
        System.assert(result.contains(testAcc.Id), 'Result should contain the Account ID matching the phone number.');
    }

    @isTest
    static void testNoAccountMatch() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "noMatchValue", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"0000\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop.');
    }

    @isTest
    static void testBothHealthcareProviderMatches() {
        HealthcareProvider testHCP1 = createTestHealthcareProvider('1234567890', '1111111111');
        HealthcareProvider testHCP2 = createTestHealthcareProvider('1234567890', '1111111111'); // Same phone number and NPI

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": "{\\"NPI\\":\\"1111111111\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when Healthcare Providers are found.');
        System.assert(result.contains(testHCP1.Id) && result.contains(testHCP2.Id), 'Result should contain both Healthcare Provider IDs.');
    }

    @isTest
    static void testHealthcareProviderNPIMatchOnly() {
        HealthcareProvider testHCP = createTestHealthcareProvider('0000000000', '2222222222'); // Different phone number but same NPI

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "9999999999", "interaction": {"attributes": {"sf_searchvalue": "{\\"NPI\\":\\"2222222222\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when NPI matches.');
        System.assert(result.contains(testHCP.Id), 'Result should contain the Healthcare Provider ID matching the NPI.');
    }

    @isTest
    static void testHealthcareProviderPhoneMatchOnly() {
        HealthcareProvider testHCP = createTestHealthcareProvider('3344556677', '3333333333'); // Different NPI but same phone number

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "3344556677", "interaction": {"attributes": {"sf_searchvalue": "{\\"NPI\\":\\"4444444444\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when phone matches.');
        System.assert(result.contains(testHCP.Id), 'Result should contain the Healthcare Provider ID matching the phone number.');
    }

    @isTest
    static void testNoHealthcareProviderMatch() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "noMatchValue", "interaction": {"attributes": {"sf_searchvalue": "{\\"NPI\\":\\"5555555555\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop.');
    }

    @isTest
    static void testWithPrefixPlus1() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "+11234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop after removing the prefix.');
    }

    @isTest
    static void testNoSearchValue() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when searchValue is missing.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop when searchValue is missing.');
    }

    @isTest
    static void testNoInteractionAttributes() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890"}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when interaction attributes are missing.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop when interaction attributes are missing.');
    }

    @isTest
    static void testEmptySfSearchValue() {
        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": ""}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null when sf_searchvalue is empty.');
        System.assert(result.contains('defaultScreenPop'), 'Result should indicate default screen pop when sf_searchvalue is empty.');
    }

    @isTest
    static void testNPIAndSSN() {
        // Test case with both NPI and SSN in the JSON payload
        HealthcareProvider testHCP = createTestHealthcareProvider('1234567890', '1111111111');
        Account testAcc = createTestAccount('1234567890', '1234');

        GenesysCTIExtensionClassV2 extension = new GenesysCTIExtensionClassV2();
        String jsonData = '{"searchValue": "1234567890", "interaction": {"attributes": {"sf_searchvalue": "{\\"Last4SSN\\":\\"1234\\",\\"NPI\\":\\"1111111111\\"}"}}}';
        String result = extension.onScreenPop(jsonData);
        
        System.assertNotEquals(null, result, 'Result should not be null.');
        System.assert(result.contains(testHCP.Id) || result.contains(testAcc.Id), 'Result should contain either the Healthcare Provider ID or the Account ID.');
    }
}