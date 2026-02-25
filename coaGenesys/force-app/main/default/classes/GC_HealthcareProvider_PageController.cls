public without sharing class GC_HealthcareProvider_PageController {
    public List<HealthcareProvider> fetchedRecords {get; private set;}
    public String fetchedRecordsJson {get; private set;} //JSON string for the records
    public String callerANI { get; private set; }

    public GC_HealthcareProvider_PageController() {
        fetchedRecords = new List<HealthcareProvider>();
        try {
            // Retrieve the serialized list of IDs from the page parameter
            String recordIdsJson = ApexPages.currentPage().getParameters().get('ids');
            callerANI = ApexPages.currentPage().getParameters().get('ani');
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
                    for (Id recordId : recordIds) {
                        if (recordsMap.containsKey(recordId)) {
                            fetchedRecords.add(recordsMap.get(recordId));
                        }
                    }
                    System.debug('Ordered Fetched Records: ' + fetchedRecords);
                }
            }
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'GC_HealthcareProvider_PageController error: ' + e.getMessage());
        }

        // Serialize the list to JSON for use in the Visualforce page
        fetchedRecordsJson = JSON.serialize(fetchedRecords);
        System.debug('Serialized fetched records JSON: ' + fetchedRecordsJson);
    }
}