# Non-Forecasted Rules

There are 1 page and 3 modals in non-forecasted and the details are as follows.

1. Home Screen
    
    Page consists of: 
    
    ---
    
    - Area/TSE filter
    - PSKU Filter
    - Add, Update Button
    - Table for displaying Data
    
    Functionalities
    
    ---
    
    - This is a view-only page
    - It displays non-forecasted data at a psku level.
    
    Operation Guide
    
    ---
    
    - Initially the page comes in Pan India/ PSKU level.
    - On changing the Area/TSE filter we can filter out the PSKUs for which the selected TSEs are applicable
    - Clicking on the eye icon provided in each row will open the detailed-view Modal
    - Clicking on add button would open the Add modal and clicking on the update button would open Update modal.

1. Detailed View
    
    Page consists of: 
    
    ---
    
    - Area/TSE filter
    - Table for displaying Data
    
    Functionalities
    
    ---
    
    - This is a view-only page
    - It displays non-forecasted data at an area/psku level.
    
    Operation Guide
    
    ---
    
    - This page comes with an additional column in the main table, which is a select box to view for which TSE, the setting is applicable for.
    - Additionally, we can view for which DBs the settings are applicable for if we click on the plus icon in each row.
    - On selecting a region/area/TSE from the filter, you will get the filtered data accordingly (If for an Area or TSE, there are no changes, then the table will display no-data)

1. Add View
    
    Page Consists of:
    
    ---
    
    - Area/TSE filter
    - Multi Select PSKU filter
    - Save All/Reset Button
    - Table
    
    Functionalities
    
    ---
    
    - This modal is used to add new PSKUs
    
    Operation Guide
    
    ---
    
    - Initially, the region/area filter are set to PAN India level
    - You can change the region/area filter so that the changes will be only applied to the selected area
    - After the area selection, you have to select the PSKUs you want to change using the PSKU selection box. It has the capability to select multiple PSKUs at the same time.
    - Once the selection is done, a table will appear with the details of PSKU, an empty selection box to populate the cgs you want the changes to be applied, and a save button to save any changes.
    - In every row, you will find a plus + icon to expand the DBs and make changes at a DB level
    - On the header you can also see an empty select box to select the cgs.
    
    Scenarios
    
    ---
    
    - Add a PSKU in pan India level
        - Click on the add button on the non-forecasted home screen
        - By default, pan India is selected
        - Underneath the area filter selection box, there is a PSKU selection box
        - Select the appropriate PSKU.
        - A table will appear with the PSKU detail and a select box to select the cgs you want to add
        - Select the cg and click on the tick icon to apply the changes.
        - After saving one PSKU, it’s removed from the table.
        
    - Add a PSKU at an area/TSE level
        - Select the appropriate Area or TSE from the area/tse filter
        - Select the PSKU you want to make changes to
        - After table appears, select the cg you want to add.
        - Save
    - Add multiple PSKU
        - As the PSKU selection box is capable of multi select, we can select more than one PSKU and make the changes either by using the line level cg select box or the header level cg select box (Change all the rows)
    - Make changes in certain DB.
        - To select dbs, use the + icon on each row and a sub table will appear
        - Select appropriate db and make cg changes
    - Save all the PSKU
        - The save all button saves all the rows that have some changes.
        - If there are no changes in any row, the button stays disabled.
        - If some rows have no changes, those rows don’t get affected by the save-all.
    
    Points to Remember
    
    ---
    
    - This overrides any previous configuration for a selected PSKU and area/TSE combination
    - This page doesn’t display partially selected CGs properly
    - The page retains cg selection even if you change the area/TSE filter.
    - If you make changes at PAN India level while partially selecting a few DBs to apply the changes to, the TSEs that don’t have those DBs will be marked as deleted in the database table.
    - If you select a few TSE/Areas using the filter, then the changes would be made in those selected Areas/TSEs.
    
    Structure of payload
    
    ---
    
    - The payload structure for save and save-all is same, the basically use the same function.
        - The payload is a single object with a key named as data.
        - The data has an object as its value and it has 2 keys, ‘payload’ and ‘selectedArea’
        - The ‘payload’ key consists of an object which stores the changed PSKU as keys. Against these PSKU codes, we have the CGs that are applicable for non-forecasted.
        - Each cg key stores an object that holds 3 keys, ‘selected’, ’unselected’ and ‘partial’.
        - The partial Key stores an Object that can hold TSEs for which there is a DB level selection,
            - e.g.: partial: {‘AP01TS01’: [’100003’,’100005’]}
        - The ‘selected’ key can store either a truth value or an array of TSE/Area and it’s the same for ‘unselected’
        - For a PSKU/CG if there are a greater number of TSE with selected value, then the ‘selected’ key becomes true or else it’s an array with the selected Area/TSE and it’s similar for ‘Unselected’.
            - E.g. selected: true or selected: [’AP01TS01’, ‘NE01’, ‘AP02’] or unselected: []
            - unselected: true or unselected: [’AP01TS01’, ‘NE01’, ‘AP02’] or unselected: []
            
            Final payload looks like this, 
            
            ```jsx
            {
                "payload": {
                    "14000000000293": {
                        "10": {
                            "selected": [],
                            "unselected": true,
                            "partial": {}
                        },
                        "
                        "62": {
                            "selected": [
                                "UP01",
                                "UP02",
                                "UP03",
                                "UP04",
                                "UP05",
                                "WB01TS03",
                                "WB03TS04",
                                "WB04TS05"
                            ],
                            "unselected": true,
                            "partial": {}
                        }, 
                        ...
                    }
                },
                "selectedArea": []
            }
            ```
            

1. Edit View
    
    Page Consists of:
    
    ---
    
    - Area/TSE filter
    - Multi Select PSKU filter
    - Save All/Reset Button
    - Table
    
    Functionalities
    
    ---
    
    - This modal is used to edit existing PSKUs
    
    Operation Guide
    
    ---
    
    - Initially, the region/area filter are set to PAN India level
    - You can change the region/area filter so that the changes will be only applied to the selected area
    - There is a PSKU multi select box to select the PSKUs you want the changes to be applied to.
    - There are 3 buttons on top of the table, Select All TSE, Reset and Save All.
    - Select All Tse button, selects all the available TSE (for the selected area/TSE filter) for every PSKUs present in the table.
    - Reset button resets the current selections and brings fresh data from the server and populates the table.
    - Save all button saves all changed rows.
    - On the header of the table there are pill shaped CG selectors, on clicking those buttons, the selection for the cg is applied across all the rows.
    - Each row, along with the PSKU desc and cg selections consists of a TSE selection box. This box shows how many TSEs are selected for an applied area/TSE filter.
    - There is a delete button in each row, which deletes the PSKU for the selected Area/TSE.
    
    Scenarios
    
    ---
    
    - Edit all PSKU in pan India level
        - By Default, the area/TSE filter is set to PAN India and the PSKU filter is selected for all PSKU, so you can just change the CGs you want to adjust using the header cg buttons and save all.
    - Edit all PSKUs in multiple selected Area or TSE
        - Change the area/TSE filter according to your need.
        - You can click on the Select All TSE button to apply changes to all available TSEs.
        - Then do the selection at header level and save all.
    - Edit multiple PSKUs at multiple selected area or TSE level
        - Multi select the area or TSE required.
        - Multi select the PSKUs
        - Change Cgs using the header cg buttons
        - Save all.
        
    
    Points to remember
    
    ---
    
    - The cg check status (Checked, Unchecked or Partial) is determined considering the selections of cg for the selected TSEs.
        - E.g.: For PSKU code 15xxxxx303 there are 480 TSEs are selected at Pan India level. Among these TSEs some TSEs have their CG-10 as checked and some have as Unchecked, so at a PSKU level CG-10 will be Partial.
        - If all 480 selected TSE had their CG-10 as checked then at the PSKU level, CG-10 would have been Checked and the same goes for the Unchecked.
    - If I remove one TSE from the TSE select box and click on save, the unselected TSE’s configuration will be deleted.
    - If we filter by a TSE/Area which isn’t selected for a certain PSKU, that PSKU’s TSE selection box would be empty. To make any changes to that PSKU, we can either select TSEs on after another using the TSE selection box, or we can use the Select All TSE button to select all the available TSE and then we can make changes to it.
    - Generally, if we add a TSE to PSKU using the TSE select box, for that TSE default values would be used (i.e. if for a cg the value is true or partial, then true would be applied for that cg for the newly selected TSE or else false would be applied)
    - If after making changed in cg, we make changes to the area/TSE filter then the changes would be gone.
    - Contrary to single TSE selection, select all TSE just selects the TSEs for all the available PSKU in the table and doesn’t populate default value for it.