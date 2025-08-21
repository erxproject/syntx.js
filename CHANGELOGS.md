### [1.0.0] - 2025-08-21
#### Feat
- Require role IDs to be strings and accept multiple roles for add/remove functions.
- Replaced client+serverID usage with message.guild to simplify API.
- Standardized error messages and made functions silent on success (library-friendly).
- **BREAKING CHANGE:**  
  The function signatures for `addRole` and `removeRole` have been updated.  
  - **Before:** `addRole({ userID, serverID, roleID }, client)`  
  - **Now:** `addRole({ user, roles: [] }, message)`  
  The same applies to `removeRole`.  
  You must update your code to the new format to avoid runtime errors.