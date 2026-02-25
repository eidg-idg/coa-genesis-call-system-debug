public class GC_Account_PageController {
    public List<Account> fetchedRecords { get; private set; }
    public String fetchedRecordsJson { get; private set; } // JSON string for the records

    public GC_Account_PageController() {
        // Retrieve the serialized list of IDs from the page parameter
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
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
                fetchedRecords = new List<Account>();
                for (Id recordId : recordIds) {
                    if (accountMap.containsKey(recordId)) {
                        fetchedRecords.add(accountMap.get(recordId));
                    }
                }
                
                System.debug('The Fetched Records from GC_Account_Page_Controller = ' + fetchedRecords);
            }
        }
        
        // Initialize with an empty list if no records are found to avoid null reference errors in the Visualforce page
        if (fetchedRecords == null) {
            fetchedRecords = new List<Account>();
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
}