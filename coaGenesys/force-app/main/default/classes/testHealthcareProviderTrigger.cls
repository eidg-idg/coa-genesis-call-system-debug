@isTest
private class testHealthcareProviderTrigger {
    
    static final String triggeringRecordTypeId = '0125f000000iIQTAA2'; //this is supplier location
    static final String searchingRecordTypeId = '0125f000000zJzmAAE'; //this is prospective provider

    @isTest static void testTriggerLogic() {
        // Create a HealthcareProvider of Type 'Prospective Provider'
        HealthcareProvider hcpFormstack = new HealthcareProvider(
            RecordTypeId = searchingRecordTypeId,
            Name = 'Incoming Formstack Record',
            UST_EPLUS__Provider_NPI__c = '2000009'
        );
        UST_EPLUS__TriggerSettings__c ts1 = new UST_EPLUS__TriggerSettings__c();
			ts1.Name = 'AllTrigger';
			ts1.UST_EPLUS__RunTrigger__c = false;

 		UST_EPLUS__TriggerSettings__c ts2 = new UST_EPLUS__TriggerSettings__c();
			ts2.Name = 'EPHealthcareProviderTrigger';
			ts2.UST_EPLUS__RunTrigger__c = false;

 		insert new List<UST_EPLUS__TriggerSettings__c> {ts1, ts2};
        insert hcpFormstack;
        
        //Create a non-matching HCP Record
        HealthcareProvider hcpNoMatch = new HealthcareProvider(
        	RecordTypeId = triggeringRecordTypeId,
            Name = 'No Match',
            UST_EPLUS__Provider_NPI__c = '9999999'
        	);
        
        UST_EPLUS__TriggerSettings__c ts3 = new UST_EPLUS__TriggerSettings__c();
			ts3.Name = 'AllTrigger';
			ts3.UST_EPLUS__RunTrigger__c = false;

 		UST_EPLUS__TriggerSettings__c ts4 = new UST_EPLUS__TriggerSettings__c();
			ts4.Name = 'EPHealthcareProviderTrigger';
			ts4.UST_EPLUS__RunTrigger__c = false;

 		insert new List<UST_EPLUS__TriggerSettings__c> {ts3, ts4};  
		insert hcpNoMatch;
        
        // Create a HealthcareProvider with Matching NPI
        HealthcareProvider hcpMatch = new HealthcareProvider(
            RecordTypeId = triggeringRecordTypeId,
            Name = 'Incoming HCP - Match',
            UST_EPLUS__Provider_NPI__c = '2000009'
        );
        UST_EPLUS__TriggerSettings__c ts5 = new UST_EPLUS__TriggerSettings__c();
			ts5.Name = 'AllTrigger';
			ts5.UST_EPLUS__RunTrigger__c = false;

 		UST_EPLUS__TriggerSettings__c ts6 = new UST_EPLUS__TriggerSettings__c();
			ts6.Name = 'EPHealthcareProviderTrigger';
			ts6.UST_EPLUS__RunTrigger__c = false;

 		insert new List<UST_EPLUS__TriggerSettings__c> {ts5, ts6};
        insert hcpMatch;

    }

    @isTest static void testDelayedDeleteHandler() {
        // Create a HealthcareProvider with the triggering record type
        HealthcareProvider hcpTriggering = new HealthcareProvider(
            RecordTypeId = triggeringRecordTypeId,
            Name = 'Second Incoming Triggering Record Name',
            UST_EPLUS__Provider_NPI__c = '1234567890'
        );

        UST_EPLUS__TriggerSettings__c ts1 = new UST_EPLUS__TriggerSettings__c();
			ts1.Name = 'AllTrigger';
			ts1.UST_EPLUS__RunTrigger__c = false;

 		UST_EPLUS__TriggerSettings__c ts2 = new UST_EPLUS__TriggerSettings__c();
			ts2.Name = 'EPHealthcareProviderTrigger';
			ts2.UST_EPLUS__RunTrigger__c = false;

 		insert new List<UST_EPLUS__TriggerSettings__c> {ts1, ts2};
        insert hcpTriggering;

        // Create a list of Ids to delete
        List<Id> idsToDelete = new List<Id>{hcpTriggering.Id};

        // Execute the DelayedDeleteHandler
        DelayedDeleteHandler handler = new DelayedDeleteHandler(idsToDelete);
        Test.startTest();
        System.enqueueJob(handler);
        Test.stopTest();

    }
}