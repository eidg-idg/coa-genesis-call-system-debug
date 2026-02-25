public class GC_HealthcareProvider_PageController {
    public List<HealthcareProvider> fetchedRecords {get; private set;}
    public String fetchedRecordsJson {get; private set;} //JSON string for the records

    public GC_HealthcareProvider_PageController() {
        // Retrieve the serialized list of IDs from the page parameter
        String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
        if (String.isNotBlank(recordIdsJson)) {
            // Deserialize the JSON string back to a list of IDs
            List<Id> recordIds = (List<Id>) JSON.deserialize(recordIdsJson, List<Id>.class);
            System.debug('Deserialized record IDs: ' + recordIds);
            
            // Query all records that match the list of IDs and preserve the order of recordIds
            if (!recordIds.isEmpty()) {
                Map<Id, HealthcareProvider> recordsMap = new Map<Id, HealthcareProvider>([
                    SELECT 
                        Id, 
                        Name,
                        UST_EPLUS__Provider_ID__c,
                        UST_EPLUS__Provider_Tax_ID__c,
                        UST_EPLUS__Provider_NPI__c,
                        UST_EPLUS__Provider_Status__c,
                        UST_EPLUS__Practice_Street_Address__c,
                        UST_EPLUS__Practice_City__c,
                        UST_EPLUS__Practice_State__c,
                        UST_EPLUS__Practice_ZIP_Code__c,
                        UST_EPLUS__Primary_Phone_Number__c
                    FROM HealthcareProvider 
                    WHERE Id IN :recordIds 
                ]);
                
                // Reorder the list based on the original order in recordIds
                fetchedRecords = new List<HealthcareProvider>();
                for (Id recordId : recordIds) {
                    if (recordsMap.containsKey(recordId)) {
                        fetchedRecords.add(recordsMap.get(recordId));
                    }
                }
                System.debug('Ordered Fetched Records: ' + fetchedRecords);
            }
        }
        
        // Initialize with an empty list if no records are found to avoid null reference errors in the Visualforce page
        if (fetchedRecords == null) {
            fetchedRecords = new List<HealthcareProvider>();
        }
        
        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
}