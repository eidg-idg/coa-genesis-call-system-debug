public class DelayedDeleteHandler implements Queueable {
    private List<Id> idsToDelete;

    public DelayedDeleteHandler(List<Id> ids) {
        this.idsToDelete = ids;
    }

    public void execute(QueueableContext context) {
        try {
            delete [SELECT Id FROM HealthcareProvider WHERE Id IN :idsToDelete];
        } catch(Exception e) {
            System.debug(LoggingLevel.ERROR, 'DelayedDeleteHandler failed for IDs: ' + idsToDelete + ' | Error: ' + e.getMessage());
        }
    }
}