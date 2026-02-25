public without sharing class GC_Account_PageController {
    public List<Account> fetchedRecords { get; private set; }
    public String fetchedRecordsJson { get; private set; } // JSON string for the records
    public String callerANI { get; private set; }

    public GC_Account_PageController() {
        fetchedRecords = new List<Account>();
        try {
            // Retrieve the serialized list of IDs from the page parameter
            String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
            callerANI = ApexPages.currentPage().getParameters().get('ani');
            if (String.isNotBlank(recordIdsJson)) {
                // Deserialize the JSON string back to a list of IDs
                List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
                System.debug('Deserialized record IDs: ' + recordIds);

                // Query all records that match the list of IDs
                if (!recordIds.isEmpty()) {
                    Map<Id, Account> accountMap = new Map<Id, Account>([
                        SELECT  Id,
                                Name,
                                Phone,
                                UST_EPLUS__Member_ID__c, UST_EPLUS__SSN_Masked__c,
                                PersonBirthdate, HealthCloudGA__BirthDate__pc, UST_EPLUS__PersonBirthDate__c,
                                PersonMailingStreet, PersonMailingCity, PersonMailingState,
                                PersonMailingPostalCode, PersonMailingCountry, Last_4_SSN_V2__c
                        FROM Account
                        WHERE Id IN :recordIds
                    ]);

                    // Preserve the order of the IDs
                    for (Id recordId : recordIds) {
                        if (accountMap.containsKey(recordId)) {
                            fetchedRecords.add(accountMap.get(recordId));
                        }
                    }

                    System.debug('The Fetched Records from GC_Account_Page_Controller = ' + fetchedRecords);
                }
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'GC_Account_PageController error: ' + e.getMessage());
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
}