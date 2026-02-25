global class SandboxRefreshScript implements SandboxPostCopy {
    
    global void runApexClass(SandboxContext context) {
        updateEmailForUser();
    }
    
    @TestVisible
    private static void updateEmailForUser() {
        List<User> users = [SELECT Id, Email FROM User WHERE FirstName = 'Jason' AND LastName = 'Kuczek' LIMIT 1];
        if (!users.isEmpty()) {
            User u = users[0];
            u.Email = 'jason.kuczek@coaccess.com';
            update u;
        }
    }
}