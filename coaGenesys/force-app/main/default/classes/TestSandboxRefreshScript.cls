@isTest
private class TestSandboxRefreshScript {
    
    @testSetup
    static void setup() {
        User testUser = new User(
            FirstName = 'Jason',
            LastName = 'Kuczek',
            Alias = 'jkuczek',
            Email = 'jason.kuczek@example.com',
            EmailEncodingKey = 'UTF-8',
            Username = 'jason.kuczek@example.com.' + DateTime.now().getTime(),
            LocaleSidKey = UserInfo.getLocale(),
            TimeZoneSidKey = 'America/Los_Angeles',
            ProfileId = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1].Id,
            LanguageLocaleKey = 'en_US'
        );
        
        insert testUser;
    }
    
    @isTest
    static void testSandboxRefreshScript() {
        // Set the Mock
        Test.setMock(SandboxPostCopy.class, new SandboxPostCopyMock());
        
        // Directly call the updateEmailForUser method
        Test.startTest();
        SandboxRefreshScript.updateEmailForUser();
        Test.stopTest();
        
        // Perform the assertion
        User modifiedUser = [SELECT Email FROM User WHERE FirstName = 'Jason' AND LastName = 'Kuczek' LIMIT 1];
        System.assertEquals('jason.kuczek@coaccess.com', modifiedUser.Email);
    }
}