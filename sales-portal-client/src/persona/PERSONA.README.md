# Persona

```
Persona is the rules describing the authorization of the roles to certain pages across the Pegasus portal.
```

# Persona: Process Flow:

# File Description:

```
1. roles.js: Defines the roles available for the portal. The roles in the User Management page are referenced from this file.
2. pegasus.js: The roles are categorized as 'ADMIN', 'SALES' and 'LOGISTICS'. The 'personaUIRef' is used to display the persona on Persona(UI) page.
3. Each file represents the tab created in the side nav(DistributorNav.js)
4. Each file generally contains the following:
    4.1. A const object( to be referenced as PRIMARY_OBJECT) with the name of the tab: Which further contains the objects with names of the available pages and their respective features. We define the access to those features in the form of an array of roles. This const is exported as default from the file, to be consumed by 'personaUIRef' in pegasus.js
    4.2. A const 'pages': This is to maintain the name of the pages created in the PRIMARY_OBJECT, simply to avoid typos and have easy referencing.
    4.3. A const 'features': This is to maintain all the features included in the PRIMARY_OBJECT, simply to avoid typos and have easy referencing.
    4.4. A function hasViewPermission(page: sting, feature: string): It is called to check if the feature is available to view to the user role. It returns in boolean. By default feature is considered as 'VIEW'.
    4.5. A function hasEditPermission(page: string, feature: string): It is called to check if the feature is available to edit to the user role. It returns in boolean. By default feature is considered as 'EDIT'.
NOTE: 'hasViewPermission()' and 'hasEditPermission()' both are used to enhance the readability of the code and have better maintenance. In reality, their functions are the same, if we provide same arguments. Additional functions can be created as per the requirement to aid in development.
```

# On creation of new tab/page:

```
1. When a new tab is created in the side nav(DistributorNav), create a new file in the 'persona' folder.
2. In the new file declare and initialize variables with the <tab-name>(aka PRIMARY_OBJECT), 'pages' and 'features'.
3. Create functions 'hasViewPermission(page, feature)' and 'hasEditPermission(page, feature)'
4. Export the PRIMARY_OBJECT as default.
5. In the pegasus.js file import the file and add it to the personaUIRef object.

1. When a new page is created, then add a new object with the page object in the respective file.
2. Each object generally has two properties: 'VIEW' and 'EDIT'
```

# On addition of new role:

```
1. Add the created role in the roles.js file.
2. Add the role to the applicable pages and features in the files available in 'pegasus' folder.
```

# Application

```
1. Import the required persona file in the UI component.
2. Use hasViewPermission() and hasEditPermission() to check the access permissions.
```
