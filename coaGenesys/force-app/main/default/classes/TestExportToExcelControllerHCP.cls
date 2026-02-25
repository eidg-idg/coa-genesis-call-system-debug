/**
 * @description       : 
 * @author            : Jason.Kuczek@coaccess.com
 * @group             : 
 * @last modified on  : 10-02-2023
 * @last modified by  : Jason.Kuczek@coaccess.com
**/
@isTest
private class TestExportToExcelControllerHCP {

    @testSetup
    static void setupTestData() {

        //UST Trigger Avoidance:

        UST_EPLUS__TriggerSettings__c ts1 = new UST_EPLUS__TriggerSettings__c();

        ts1.Name = 'AllTrigger';

        ts1.UST_EPLUS__RunTrigger__c = false;

        

        UST_EPLUS__TriggerSettings__c ts2 = new UST_EPLUS__TriggerSettings__c();

        ts2.Name = 'EPHealthcareProviderTrigger';

        ts2.UST_EPLUS__RunTrigger__c = false;

        

        insert new List<UST_EPLUS__TriggerSettings__c> {ts1, ts2};
        // Create test data for each of the objects being queried in the class methods.

        // Create a sample record for the Healthcare_Provider_Form__c object
        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;

        // Create a sample record for the Healthcare_Provider_Form__c object using the Id from the above record
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;
        System.debug('Inserted Healthcare_Provider_Form__c with Id: ' + testHCPForm.Id);

        // Create a sample record for the Contact_Form__c object using the Id from the Healthcare_Provider_Form__c record
        Contact_Form__c testContactForm = new Contact_Form__c(
            Name = 'Test Contact Form',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testContactForm;

        Healthcare_Practitioner_facility_Form__c testFacilityForm = new Healthcare_Practitioner_facility_Form__c(
            Name = 'Test Facility Form',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testFacilityForm;

        // Create a sample record for the Practitioner_Contact_Form__c object using the Id from the Healthcare_Provider_Form__c record
        Practitioner_Contact_Form__c testPractitionerContactForm = new Practitioner_Contact_Form__c(
            Name = 'Test Practitioner Contact Form',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testPractitionerContactForm;
    }

    @isTest
    static void testGetRelatedContactFormRecords() {
        // Query for the testHCPForm record

        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;
        
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;

        Contact_Form__c testContactForm = new Contact_Form__c(
            Name = 'Test Contact Form',
            Healthcare_Provider_Form__c = testHCPForm.Id,
            Contact_Type__c = 'Billing',
            FirstName__c = 'Test First Name',
            LastName__c = 'Test Last Name',
            Title__c = 'Test Title',
            Email__c = 'email@email.com',
            Phone__c = '303-303-3030'

        );
        insert testContactForm;

        Healthcare_Provider_Form__c testHCPForm2 = [SELECT Id FROM Healthcare_Provider_Form__c WHERE Id = :testHCPForm.Id LIMIT 1];
    
        // Setup test context
        Test.startTest();
    
        // Call the method and assert the results
        List<Contact_Form__c> results = ExportToExcelControllerHCP.getRelatedContactFormRecords(testHCPForm2.Id);
        System.assertEquals(1, results.size()); // Assuming you've created one related Contact_Form__c record in the test setup
    
        Test.stopTest();
    }
    

    @isTest
    static void testGetRelatedHealthcareIndividualFormRecords() {
        // Setup test context

        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;
        
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;

        Healthcare_Individual_Form__c testHCIForm = new Healthcare_Individual_Form__c(
            Name = 'Test Individual Owner',
            Owner_Title__c = 'Owner',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testHCIForm;

        Healthcare_Provider_Form__c testHCPForm3 = [SELECT Id FROM Healthcare_Provider_Form__c WHERE Id = :testHCPForm.Id LIMIT 1];

        Test.startTest();

        // Call the method and assert the results
        List<Healthcare_Individual_Form__c> results2 = ExportToExcelControllerHCP.getRelatedHealthcareIndividualFormRecords(testHCPForm3.Id);
        System.assertEquals(1, results2.size());

        // ... similar to above

        Test.stopTest();
    }
//Test for owner organizations
    @isTest
    static void testGetRelatedHealthcareOrganizationFormRecords() {
        // Setup test context

        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;
        
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;

        Healthcare_Organization_Form__c testHCOForm = new Healthcare_Organization_Form__c(
            Name = 'Test Individual Owner',
            TIM__c = '99-99999',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testHCOForm;

        Healthcare_Provider_Form__c testHCPForm3 = [SELECT Id FROM Healthcare_Provider_Form__c WHERE Id = :testHCPForm.Id LIMIT 1];

        Test.startTest();

        // Call the method and assert the results
        List<Healthcare_Organization_Form__c> results2 = ExportToExcelControllerHCP.getRelatedHealthcareOrganizationFormRecords(testHCPForm3.Id);
        System.assertEquals(1, results2.size());

        // ... similar to above

        Test.stopTest();
    }

//Test for Locations / Facilities
    @isTest
    static void testGetRelatedFacilityRecords() {
        // Setup test context

        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;
        
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;

        Healthcare_Practitioner_facility_Form__c hpf = new Healthcare_Practitioner_facility_Form__c(
            Name = 'Test Facility',
            Healthcare_Provider_Form__c = testHCPForm.Id

        );
        insert hpf;

        Healthcare_Provider_Form__c testHCPForm3 = [SELECT Id FROM Healthcare_Provider_Form__c WHERE Id = :testHCPForm.Id LIMIT 1];

        Test.startTest();

        // Call the method and assert the results
        List<Healthcare_Practitioner_facility_Form__c> results2 = ExportToExcelControllerHCP.getRelatedFacilityRecords(testHCPForm3.Id);
        System.assertEquals(1, results2.size());

        // ... similar to above

        Test.stopTest();
    }

//Test for Practitioner Contacts

    @isTest
    static void testGetRelatedPractitionerRecords() {
        // Setup test context

        HealthcareProvider testHCP = new HealthcareProvider(
            Name = 'Test Healthcare Provider'
        );
        insert testHCP;
        
        Healthcare_Provider_Form__c testHCPForm = new Healthcare_Provider_Form__c(
            Name = 'Test HCP Form',
            Healthcare_Provider_V2__c = testHCP.Id
        );
        insert testHCPForm;

        Practitioner_Contact_Form__c testPractitioner = new Practitioner_Contact_Form__c(
            Name = 'Test Practitioner',
            Healthcare_Provider_Form__c = testHCPForm.Id
        );
        insert testPractitioner;

        Healthcare_Provider_Form__c testHCPForm3 = [SELECT Id FROM Healthcare_Provider_Form__c WHERE Id = :testHCPForm.Id LIMIT 1];

        Test.startTest();

        // Call the method and assert the results
        List<Practitioner_Contact_Form__c> results2 = ExportToExcelControllerHCP.getRelatedPractitionerRecords(testHCPForm3.Id);
        System.assertEquals(1, results2.size());

        // ... similar to above

        Test.stopTest();
    }


}