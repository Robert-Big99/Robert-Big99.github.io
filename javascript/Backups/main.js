/**
 * FILE: main.js
 * VERSION: 1.0.1
 * DATE: 12/05/2024
 * AUTHOR: REDACTED
 *
 * DESCRIPTION:
 * This application is a complete redesign of WebDesignProject.xlsm for the Client Andrei Perkhounkov. It will function
 * in any modern web browser, and most modern devices, both mobile and desktop. The application will be used to help
 * teach statistics to students using web design as a driver of the education. It will accomplish this by simulating
 * improvements or reductions in click-through rates on a moveable element in correlation with the distance from
 * hidden element(s). It will then print the changes in the sample size out onto the webpage. Allowing the student
 * to review and infer if the changes made are effective.
 *
 * VERSION NOTES:
 * Version 1.0.1 is a hot patch containing several new QoL features as per the request of the client. Such as a loading
 * icon for when the page loads, a first time popup to give the user info on the program, a popup to tell the user
 * scroll down to the sample results, animations for sample and population events, and a testing status box containing
 * a clock.
 *
 * New functions added - startTestingStatus, stopTestingStatus, createInitialSummary, triggerGlowEffect and
 * drawMovableElementWithGlow. Along with several changes to functions like lockCanvas, createSampleSummary,
 * createPopulationSummary, createSampleTable, createPopulationTable and updateClockSpeed.
 *
 * DEVELOPER NOTE:
 * Much of this may needs to be refactored in a later iteration. As many changes were patched in last minute to meet
 * client demands. Please report any poorly implemented code for reassessment.
 **/
        (function () {
            'use strict';
            /*** Global Constants and Variables ***/

            // Controls the visibility of the Hidden elements
            let showHiddenElements = false;

                        // Canvas Images
                        const backgroundImage = 'images/Algebra_Website.png';
                        const movableElementImage = 'images/Equation_Solver.png';

            // Canvas Settings
            const MODEL_WIDTH = 960;
            const MODEL_HEIGHT = 640;

            // Canvas Elements and Context
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            // Canvas Background Image
            const img = new Image();
            img.src = backgroundImage;
            img.onload = () => drawElements();
            img.onerror = () => {
                console.error('Failed to load background image.');
                // Fallback to solid background color
                drawElements();
            };

            // Movable Element Image
            const movableImg = new Image();
            movableImg.src = movableElementImage;
            movableImg.onload = () => drawElements();
            movableImg.onerror = () => {
                console.error('Failed to load movable element image.');
                // Fallback to default drawing
                drawElements();
            };

            // Interface Elements
            const tabs = document.getElementById('tabs');
            const tabContents = document.getElementById('tab-contents');
            const rotatePrompt = document.getElementById('rotate-prompt');

            // Hidden and Movable Elements
            // NOTE: Coordinates for hidden and movable elements are normalized to being between (0 and 1)
            let canvasObjects=[
            [{ x: 0.9, y: 0.3, width: 0.1, height: 0.05, color: '#00ff00' }, { x: 0.85, y: 0.6, radius: 0.025, color: '#ff0000' }, { x: 0.1, y: 0.3, radius: 0.025, color: '#ff0000' }],
            [{ x: 0.2, y: 0.3, width: 0.1, height: 0.05, color: '#00ff00' }, { x: 0.1, y: 0.3, radius: 0.025, color: '#ff0000' }, { x: 0.1, y: 0.3, radius: 0.025, color: '#ff0000' }]
            ];

            let isDragging = false;       // Indicates if the movable element is being dragged
            let spotChanged = false;      // Indicates if the movable element's position has changed from the last placement
            let initialMovement = false;  // Indicates if the movable element's position has changed from the starting position
            let canvasLocked = false;     // Indicates if the canvas is locked (movable element is no longer movable)
            let ellipsesInterval = null;  // Stores the interval ID

            let zoneCount = 0;            // Total number of zones        
            let sampleCounter = 0;        // Counter for the number of samples taken for each location
            let locationCounter = 0;      // Counter for the number of locations sampled


            const zoneSamples = {};       // Stores sample data for each zone
            const zonePopulations = {};   // Stores population data for each zone
            const solverPositions = {};   // Object to store the canvas state for each tab

            // Variables for canvas dimensions and offsets
            let leftOffset, topOffset, canvasDisplayWidth, canvasDisplayHeight;

            // Stores text representations of the canvas for each location
            const canvasRepresentations = {};

            /*** Utility Functions ***/

            /*
            * DESCRIPTION:
            * Clamps a value between a specified minimum and maximum.
            *
            * INPUT:
            * value - The number to clamp
            * min - The minimum allowed value
            * max - The maximum allowed value
            *
            * OUTPUT:
            * The clamped value
            */
            function clamp(value, min, max) {
                return Math.max(min, Math.min(value, max));
            }

            /*
            * DESCRIPTION:
            * Adjusts the canvas settings based on its current size and position on the screen.
            * Updates global variables for offsets and display dimensions.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Updates leftOffset, topOffset, canvasDisplayWidth, canvasDisplayHeight
            */
            function adjustCanvasSettings() {
                const rect = canvas.getBoundingClientRect(); // Gets the canvas position relative to viewport
                const computed = window.getComputedStyle(canvas); // Gets the computed styles
                leftOffset = rect.left;
                topOffset = rect.top;
                canvasDisplayWidth = parseInt(computed.width);
                canvasDisplayHeight = parseInt(computed.height);
            }

            /*
            * DESCRIPTION:
            * Resizes the canvas to match its client dimensions and redraws elements.
            * Ensures the canvas maintains the correct aspect ratio and scales correctly.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Resizes canvas and redraws elements
            */
            function resizeCanvas() {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                adjustCanvasSettings();
                drawElements();
            }

            /*
            * DESCRIPTION:
            * Throttles a function to limit how often it can fire.
            * Useful for performance optimization during events like scrolling or resizing.
            *
            * INPUT:
            * func - The function to throttle
            * limit - The time limit in milliseconds
            *
            * OUTPUT:
            * Returns a throttled version of the input function
            */
            const throttle = (func, limit) => {
                let inThrottle = false;
                return function (...args) {
                    if (!inThrottle) {
                        func.apply(this, args);
                        inThrottle = true;
                        setTimeout(() => inThrottle = false, limit);
                    }
                };
            };

            /*
            * DESCRIPTION:
            * Converts screen (client) coordinates to  model coordinates [0..1].
            * This ensures interactions are consistent across any screen size.
            *
            * INPUT:
            * screenX - The X coordinate on the screen (clientX)
            * screenY - The Y coordinate on the screen (clientY)
            *
            * OUTPUT:
            * An object with x and y properties representing model coordinates (between 0 and 1)
            */
            function toModelCoordinates(screenX, screenY) {
                const normalizedX = (screenX - leftOffset + window.scrollX) / canvasDisplayWidth;
                const normalizedY = (screenY - topOffset + window.scrollY) / canvasDisplayHeight;
                return { x: normalizedX, y: normalizedY };
            }

            /*
            * DESCRIPTION:
            * Moves the movable element based on user interaction.
            * Ensures the element stays within the bounds of the model.
            * The movable element's position is always stored as coordinates [0..1].
            *
            * INPUT:
            * clientX - The X coordinate from the event
            * clientY - The Y coordinate from the event
            *
            * OUTPUT:
            * Updates movableElement's position and redraws elements
            */
            function moveElement(clientX, clientY, canvasObject) {
                movableElement = [];

                const { x, y } = toModelCoordinates(clientX, clientY);

                // Calculates half dimensions to keep the element within [0..1]
                const halfWidth = movableElement.width / 2;
                const halfHeight = movableElement.height / 2;

                // Ensures the movable element stays within bounds
                movableElement.x = clamp(x, halfWidth, 1 - halfWidth);
                movableElement.y = clamp(y, halfHeight, 1 - halfHeight);

                drawElements();
            }

            /*
            * DESCRIPTION:
            * Calculates the Euclidean distance between two elements in the model.
            * Returns the distance in model units (e.g., same units as MODEL_WIDTH and MODEL_HEIGHT).
            *
            * INPUT:
            * elementA - The first element with properties x and y (between 0 and 1)
            * elementB - The second element with properties x and y (between 0 and 1)
            *
            * OUTPUT:
            * The distance between elementA and elementB in model units
            */
            const calculateDistance = (a, b) => {
                const deltaX = (a.x - b.x) * MODEL_WIDTH;
                const deltaY = (a.y - b.y) * MODEL_HEIGHT;
                return Math.hypot(deltaX, deltaY); // Returns Euclidean distance in model units
            };

            /*
            * DESCRIPTION:
            * Draws all elements (background, hidden, and movable) on the canvas.
            * Clears the canvas, scales context, and draws each element according to model dimensions.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Renders elements on the canvas
            */
            function drawElements() {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
                ctx.save();
                ctx.scale(canvas.width / MODEL_WIDTH, canvas.height / MODEL_HEIGHT); // Scale context to model space

                // Draws background image if loaded
                if (img.complete && img.naturalWidth !== 0) {
                    ctx.drawImage(img, 0, 0, MODEL_WIDTH, MODEL_HEIGHT);
                } else {
                    // If background image not loaded, use fallback background color
                    ctx.fillStyle = '#444';
                    ctx.fillRect(0, 0, MODEL_WIDTH, MODEL_HEIGHT);
                }

                // Draws hidden elements based on the showHiddenElements flag
                ctx.save();
                if (showHiddenElements === true) {
                    ctx.globalAlpha = 1;
                } else {
                    ctx.globalAlpha = 0;
                }
                for (let canvasObject of canvasObjects) {
                    for (let hiddenElement = 1; hiddenElement <= canvasObject.length;) {}
                    canvasObject[hiddenElement].forEach(drawCircle)
                }
                ctx.restore();

                // Draws the movable element as image if loaded, else as circle
                if (movableImg.complete && movableImg.naturalWidth !== 0) {
                    const { x, y, width, height } = movableElement;
                    ctx.drawImage(
                        movableImg,
                        x * MODEL_WIDTH - (width * MODEL_WIDTH) / 2,
                        y * MODEL_HEIGHT - (height * MODEL_HEIGHT) / 2,
                        width * MODEL_WIDTH,
                        height * MODEL_HEIGHT
                    );
                } else {
                    // Draws the movable element as a circle if image not available
                    drawCircle(movableElement);
                }

                ctx.restore();
            }

            /*
            * DESCRIPTION:
            * Draws a circle representing an element on the canvas.
            * The element's coordinates are normalized and need to be scaled by MODEL_WIDTH/HEIGHT.
            *
            * INPUT:
            * element - Object with properties x, y, radius, color (all normalized except color)
            *
            * OUTPUT:
            * Renders a circle on the canvas
            */
            function drawCircle(element) {
                const centerX = element.x * MODEL_WIDTH;
                const centerY = element.y * MODEL_HEIGHT;
                const radius = element.radius * MODEL_HEIGHT;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = element.color;
                ctx.fill();
                ctx.closePath();
            }

            /*
            * DESCRIPTION:
            * Starts the "Testing Changes" animation by displaying a message and cycling ellipses. -> (., .., ...)
            * Hides the tab container during this phase.
            *
            * INPUT:
            * duration - The total duration for which the animation will run (in milliseconds).
            * type - The type of testing being performed, used to set appropriate text (e.g., "sample", "final").
            *
            * OUTPUT:
            * Returns the interval ID for the ellipses animation, which can be used to stop it later.
            */
            function startTestingStatus(duration, type) {
                // Clear any existing interval before starting a new one
                if (ellipsesInterval !== null) {
                    clearInterval(ellipsesInterval);
                }

                // Hides the tab container
                const tabContainer = document.getElementById('tab-container');
                tabContainer.style.visibility = 'hidden';

                const testingStatus = document.getElementById('testing-status-text');
                testingStatus.style.visibility = 'visible';
                testingStatus.textContent = ''; // Clear previous text

                let ellipses = '';
                let message = '';

                // Determine the message based on the type
                if (type === 'sample') {
                    message = 'Testing Changes for one day';
                } else if (type === 'final') {
                    message = 'Gathering results for the month';
                }

                // Animate the ellipses
                ellipsesInterval = setInterval(() => {
                    ellipses = ellipses.length < 3 ? ellipses + '.' : ''; // Cycle through `.`, `..`, `...`
                    testingStatus.textContent = `${message}${ellipses}`;
                }, 400); // Adjust animation speed (change as needed)

                // Automatically stop the animation after the duration
                setTimeout(() => {
                    stopTestingStatus();
                }, duration);
            }

            /*
            * DESCRIPTION:
            * Stops the "Testing Changes" animation by hiding the message and stopping the ellipses animation.
            *
            * INPUT:
            * NONE
            *
            * OUTPUT:
            * None. Clears the animation, hides the text, and activates the latest tab.
            */
            function stopTestingStatus() {
                // Stop the ellipses animation
                if (ellipsesInterval !== null) {
                    clearInterval(ellipsesInterval);
                    ellipsesInterval = null; // Reset the interval ID
                }

                // Hides the testingStatus text
                const testingStatus = document.getElementById('testing-status-text');
                testingStatus.style.visibility = 'hidden'; // Hide the text

                // Shows the tab container
                const tabContainer = document.getElementById('tab-container');
                tabContainer.style.visibility = 'visible';
            }

            /*
            * DESCRIPTION:
            * Initializes sample and population data for each zone.
            * Populates zones and zonePopulations objects with data.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Updates zones and zonePopulations with sample data
            */
            function initializeData() {
                /*
                * NOTE:
                * Depending on the placement of the hidden zones, not all areas
                * may be used due to how the proximity factor is calculated in
                * the selectZoneByDistance function.
                */
                // FIX | MODIFY -> try to rewrite the proximity factor
                const zoneData = [
                    { views: 10000, clicks: 9134 }, // Closest to the hidden element(s)
                    { views: 10000, clicks: 8015 },
                    { views: 10000, clicks: 7123 },
                    { views: 10000, clicks: 6012 },
                    { views: 10000, clicks: 5103 }, 
                    { views: 10000, clicks: 4403 },
                    { views: 10000, clicks: 1607 },
                    { views: 10000, clicks: 1067 },
                    { views: 1000, clicks: 1 }  // Furthest from the hidden element(s)
                ];

                const sampleNum = 30;   // Number of samples per zone
                const sampleSize = 150;  // Sample size (reduced as requested)
                const sampleVar = 100;  // The variability of the sample size (Acts as a upper bound)

                zoneCount = zoneData.length; // The total number of zones
                zoneData.forEach((zone, index) => {
                    // Creates an array representing the population with clicks (1) and views without clicks (0)
                    zonePopulations[`zone${index + 1}`] = Array(zone.clicks).fill(1).concat(Array(zone.views - zone.clicks).fill(0));
                
                    // Generates samples by randomly selecting from the population stored in zonePopulations
                    zoneSamples[`zone${index + 1}`] = Array.from({ length: sampleNum }, () =>
                        Array.from({ length: sampleSize + (Math.floor(Math.random() * sampleVar)) }, () =>
                            zonePopulations[`zone${index + 1}`][Math.floor(Math.random() * zonePopulations[`zone${index + 1}`].length)]
                        )
                    );
                }); 
            }

            /*
            * DESCRIPTION:
            * Selects the appropriate zone and sample data based on the distance from the movable element,
            * hidden element(s), and the corners of the canvas.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * An object containing:
            *   - samples: The sample data for the selected zone
            *   - zoneIndex: The index of the selected zone
            */
            function selectZoneByDistance() {
                // Define the corners of the canvas (Uses model coordinates)
                const canvasCorners = [
                    { x: 0, y: 0 }, // Top left
                    { x: 1, y: 0 }, // Top right
                    { x: 0, y: 1 }, // Bottom left
                    { x: 1, y: 1 }, // Bottom right
                ];
            
                // Finds the closest distance to any hidden element
                const closestDistance = Math.min(
                    ...hiddenElements.map(element => calculateDistance(movableElement, element))
                );
            
                // Finds the maximum possible distance in the model
                const maxDistance = hiddenElements.reduce((maxDist, element) => 
                    Math.max(maxDist, 
                        Math.max(...canvasCorners.map(corner => calculateDistance(element, corner)))
                    ), 0
                );
            
                // Calculates the proximity factor and finds the zone index
                const proximityFactor = closestDistance / maxDistance;
                const zoneIndex = Math.min(
                    Math.max(0, Math.floor(proximityFactor * zoneCount)),
                    zoneCount - 1
                );
            
                // Return the selected zone's data and index
                return {
                    samples: zoneSamples[`zone${zoneIndex + 1}`] || [],
                    zoneIndex,
                };
            }

            /*
            * DESCRIPTION:
            * Pulls a random sample from the selected zone's samples.
            *
            * INPUT:
            * selectedZoneSamples - The samples array for a particular zone
            *
            * OUTPUT:
            * A random sample array, or null if none available
            */
            function pullSample(selectedZoneSamples) {
                if (selectedZoneSamples.length === 0) {
                    console.error("No samples available for the selected zone.");
                    return null;
                }
                const sampleIndex = Math.floor(Math.random() * selectedZoneSamples.length);
                return selectedZoneSamples[sampleIndex];
            }

            /*
            * DESCRIPTION:
            * Adds a new tab to the interface for each location sampled.
            * Initializes tab content and sets up event listeners.
            *
            * INPUT:
            * label - The label for the tab (e.g., location number)
            *
            * OUTPUT:
            * Adds a new tab and content section to the DOM
            */
            function addTab(label) {
                // Creates the tab element
                const tabId = `tab-${label}`;
                const contentId = `content-${label}`;
                const tab = document.createElement('div');
                tab.className = 'tab';
                tab.id = tabId;
                tab.textContent = `Location ${label}`;
                tab.onclick = () => showTab(tabId, contentId);
                tabs.appendChild(tab);

                // Creates the content container
                const content = document.createElement('div');
                content.className = 'tab-content';
                content.id = contentId;

                // Creates the 'Show Spreadsheet' button
                const showSpreadsheetButton = document.createElement('button');
                showSpreadsheetButton.textContent = 'Show Spreadsheet';
                showSpreadsheetButton.title = 'Toggle the data table';
                showSpreadsheetButton.onclick = () => toggleSpreadsheet(contentId, showSpreadsheetButton);

                // Creates the spreadsheet container
                const spreadsheetContainer = document.createElement('div');
                spreadsheetContainer.id = `${contentId}-spreadsheet`;
                spreadsheetContainer.style.display = 'none';

                // Appends elements to content
                content.append(showSpreadsheetButton, spreadsheetContainer);
                tabContents.appendChild(content);

                // Save current position of the equation solver for this tab
                solverPositions[tabId] = { x: movableElement.x, y: movableElement.y };
            }

            /*
            * DESCRIPTION:
            * Displays the selected tab and hides others.
            * Updates the active class on tabs and content.
            *
            * INPUT:
            * tabId - The ID of the tab to show
            * contentId - The ID of the content to display
            *
            * OUTPUT:
            * Shows the selected tab content and highlights the tab
            */
            function showTab(tabId, contentId) {
                // Hide all tab contents and remove 'active' class from tabs
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

                // Show the selected content and add 'active' class to the tab
                document.getElementById(contentId).classList.add('active');
                document.getElementById(tabId).classList.add('active');
                
                // Restores the equation solver's position
                const position = solverPositions[tabId];
                if (position) {
                    movableElement.x = position.x;
                    movableElement.y = position.y;
                    drawElements(); // Redraws the canvas with updated position
                }
            }

            /*
            * DESCRIPTION:
            * Toggles the visibility of the sample data table in the tab content.
            * Also hides or shows summary elements accordingly.
            *
            * INPUT:
            * contentId - The ID of the content where the spreadsheet is located
            * button - The button element that was clicked
            *
            * OUTPUT:
            * Toggles display of the spreadsheet and updates button text
            */
            function toggleSpreadsheet(contentId, button) {
                const spreadsheet = document.getElementById(`${contentId}-spreadsheet`);
                const summaries = document.querySelectorAll(`#${contentId} .summary`);

                if (spreadsheet.style.display === 'none') {
                    // Shows spreadsheets and hides summaries
                    spreadsheet.style.display = 'block';
                    summaries.forEach(s => s.style.display = 'none');
                    button.textContent = 'Hide Spreadsheet';
                } else {
                    // Hides spreadsheets and shows summaries
                    spreadsheet.style.display = 'none';
                    summaries.forEach(s => s.style.display = 'block');
                    button.textContent = 'Show Spreadsheet';
                }
            }

            /*
            * DESCRIPTION:
            * Creates the initial data to use in comparison with the new location choices after
            * the page finishes loading.
            *
            * INPUT:
            * zoneIndex - The index of the selected zone
            *
            * OUTPUT:
            * Adds a summary element to the initial-data div.
            */
            function createInitialSummary(zoneIndex) {
                const data = zonePopulations[`zone${zoneIndex + 1}`];
                data.splice(-(Math.random() * 100));
                const initialSize = data.length;
                const initialClicks = data.reduce((acc, val) => acc + val, 0);
                const ctr = ((initialClicks / initialSize) * 100).toFixed(2);

                // Creates the population summary element
                const initialSummary = document.createElement('div');
                initialSummary.className = 'initial summary';
                initialSummary.innerHTML = `<p><span class= "line">[Current Monthly Average]</span> <span class= "line">Number of Users: ${initialSize}</span> <span class= "line"> Number of clicks: ${initialClicks}  </span> <span class= "line"> Click-Through Rate: ${ctr}% </span></p>`;
                document.getElementById('initial-summary').appendChild(initialSummary);
            }

            /*
            * DESCRIPTION:
            * Creates a summary of a sample, including fetching data, performing calculations,
            * updating the canvas state, and managing tab content.
            *
            * INPUT:
            * ContentId - The ID of the content where the summary will be added (created from locationCounter)
            * 
            * OUTPUT:
            * Adds a summary element to the content, locks the canvas, starts the testing
            * status animation, and captures the canvas representation
            */
            function createSampleSummary(ContentId) {
                // Fetch the selected zone's samples and pull a random sample
                const { samples: selectedZoneSamples } = selectZoneByDistance();
                const randomSample = pullSample(selectedZoneSamples);
                if (!randomSample) return;

                // Sample data calculations
                const sampleClicks = randomSample.reduce((acc, val) => acc + val, 0);
                const samplePopulation = randomSample.length;
                const sampleCTR = ((sampleClicks / samplePopulation) * 100).toFixed(2);

                // Updates the sample counter
                sampleCounter++;

                // Create the sample summary element
                const summary = document.createElement('div');
                summary.className = 'summary sample-summary';
                summary.innerHTML = `<p><span class= "line"><p>[Day ${sampleCounter}]</span><br> <span class= "line">Number of Users: ${samplePopulation} </span> <span class= "line"> Number of clicks: ${sampleClicks} </span> <span class= "line">Click-Through Rate: ${sampleCTR}% </span></p>`;
                document.getElementById(ContentId).appendChild(summary);

                // UPDATE | REFACTOR
                // This not clean but it works for now
                lockCanvas(3000);                       // Locks the canvas
                startTestingStatus(3000, "sample");     // Triggers the glow effect
                updateClockSpeed(2, 3000);              // Initiates clock spin
                triggerGlowEffect(3000, sampleClicks);  // Displays the testing status

                // Creates the data table for the sample
                createSampleTable(ContentId, sampleCounter, randomSample);

                // Capture the canvas layout in text format at the time of the button press
                canvasRepresentations[ContentId] = generateTextCanvasRepresentation();
            }

            /*
            * DESCRIPTION:
            * Creates a table displaying the sample data and adds it to the spreadsheet container.
            *
            * INPUT:
            * contentId - The ID of the content where the table will be added
            * sampleCounter - The number of the sample
            * data - An array of sample data (0s and 1s)
            *
            * OUTPUT:
            * Adds a sample data table to the spreadsheet container
            */
            function createSampleTable(contentId, sampleCounter, data) {
                const spreadsheet = document.getElementById(`${contentId}-spreadsheet`);
                const table = document.createElement('table');
                table.className = 'data-table';

                // Constructs the HTML table
                table.innerHTML = `
                    <tr><th colspan="${data.length + 1}">Day ${sampleCounter}</th></tr>
                    <tr><th>User</th>${data.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr>
                    <tr><td>Clicked</td>${data.map(v => `<td>${v}</td>`).join('')}</tr>
                `;
                spreadsheet.appendChild(table);
            }

            /*
            * DESCRIPTION:
            * Creates a summary of the population data for the selected zone and adds it to the content.
            *
            * INPUT:
            * contentId - The ID of the content to update
            * zoneIndex - The index of the selected zone
            *
            * OUTPUT:
            * Adds a population summary to the content
            */
            function createPopulationSummary(contentId, zoneIndex) {
                const data = zonePopulations[`zone${zoneIndex + 1}`];
                data.splice(-(Math.random() * 100));
                const populationSize = data.length;
                const totalClicks = data.reduce((acc, val) => acc + val, 0);
                const ctr = ((totalClicks / populationSize) * 100).toFixed(2);

                // Creates the population summary element
                const summary = document.createElement('div');
                summary.className = 'summary population';
                summary.innerHTML = `<p><span class= "line">[Monthly Results]</span><br> <span class= "line">Number of Users: ${populationSize} </span> <span class= "line"> Number of clicks: ${totalClicks} </span> <span class= "line">Click-Through Rate: ${ctr}% </span></p>`;
                document.getElementById(contentId).appendChild(summary);

                // UPDATE | REFACTOR
                // This not clean but it works for now
                lockCanvas(0);                           // Locks the canvas
                startTestingStatus(12000, "final");      // Triggers the glow effect
                updateClockSpeed(60, 12000);             // Initiates clock spin
                triggerGlowEffect(12000, totalClicks);   // Displays the testing status

                // Creates the data table for the zone
                createPopulationTable(contentId, zoneIndex);

                // Captures the canvas layout in text format at the time of the button press
                canvasRepresentations[contentId] = generateTextCanvasRepresentation();
            }

            /*
            * DESCRIPTION:
            * Creates a table displaying the population data and adds it to the spreadsheet container.
            *
            * INPUT:
            * contentId - The ID of the content where the table will be added
            * zoneIndex - The index of the selected zone
            *
            * OUTPUT:
            * Adds a population data table to the spreadsheet container
            */
            function createPopulationTable(contentId, zoneIndex) {
                const data = zonePopulations[`zone${zoneIndex + 1}`];
                const spreadsheet = document.getElementById(`${contentId}-spreadsheet`);
                const table = document.createElement('table');
                table.className = 'data-table';

                const chunkSize = 50; // Number of entries per row
                let tableHTML = '';

                // Loop through chunks of the population data
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    tableHTML += `
                        <tr><th>User</th>${chunk.map((_, idx) => `<th>${i + idx + 1}</th>`).join('')}</tr>
                        <tr><td>Clicked</td>${chunk.map(v => `<td>${v}</td>`).join('')}</tr>
                    `;
                }

                table.innerHTML = tableHTML;
                spreadsheet.appendChild(table);
            }

            /*
            * DESCRIPTION:
            * Generates a text representation of the canvas, showing hidden elements and the movable element.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Returns a string containing the text representation
            */
            function generateTextCanvasRepresentation() {
                const width = 80; // Width of the canvas representation
                const height = 20; // Height of the text representation

                const horizontalBorder = '+' + '-'.repeat(width - 2) + '+';
                let canvasString = horizontalBorder + '\n';

                // Builds the canvas array
                let canvasArray = Array.from({ length: height }, () => '|' + ' '.repeat(width - 2) + '|\n');

                /*
                * DESCRIPTION:
                * Calculates the position of an element within the text canvas.
                *
                * INPUT:
                * element - The element with x and y properties ( between 0 and 1)
                *
                * OUTPUT:
                * An object with xPos and yPos indicating positions in the canvas array
                */
                function getPosition(element) {
                    const xPos = Math.round(element.x * (width - 2));
                    const yPos = Math.round(element.y * (height - 1));
                    return {
                        xPos: Math.min(Math.max(xPos, 1), width - 3),
                        yPos: Math.min(Math.max(yPos, 0), height - 1)
                    };
                }
                        
                /*
                * DESCRIPTION:
                * Places a label into the canvas array at the specified position.
                *
                * INPUT:
                * canvasArray - The array representing the canvas
                * xPos - The X position in the canvas array
                * yPos - The Y position in the canvas array
                * label - The string label to place (e.g., '[H]', '[M]')
                *
                * OUTPUT:
                * Modifies the canvasArray to include the label
                */
                function placeLabel(array, x, y, label) {
                    let line = array[y];
                    const lineLength = line.length - 1; // Excludes newline character

                    // Adjusts xPos if label would overflow
                    x = Math.min(Math.max(x, 1), lineLength - label.length - 1);
                    array[y] = line.slice(0, x) + label + line.slice(x + label.length);
                }

                // Places the labels for hidden elements [H]
                hiddenElements.forEach(hiddenElement => {
                    const hiddenPos = getPosition(hiddenElement);
                    placeLabel(canvasArray, hiddenPos.xPos, hiddenPos.yPos, '[H]');
                });

                // Places the label for the movable element [M]
                const movablePos = getPosition(movableElement);
                placeLabel(canvasArray, movablePos.xPos, movablePos.yPos, '[M]');

                canvasString += canvasArray.join('') + horizontalBorder;
                return canvasString;
            }

            /*
            * DESCRIPTION:
            * Copies all sample summaries and canvas representations to the clipboard.
            * Collects data from all tabs and formats it for copying.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Copies data to the user's clipboard
            */
            function copyAllDataToClipboard() {
                let data = '';

                // Collects data from all tabs
                document.querySelectorAll('.tab-content').forEach(content => {
                    const tabId = content.id.replace('content-', 'tab-');
                    const tab = document.getElementById(tabId);
                    if (tab) data += `${tab.textContent}\n`;

                    // Includes data summary if present
                    const dataSummary = content.querySelector('.summary.population');
                    if (dataSummary) data += `${dataSummary.textContent.trim()}\n`;

                    // Collect sample summaries
                    content.querySelectorAll('.sample-summary').forEach(summary => {
                        data += `${summary.textContent}\n`;
                    });
                    
                    // Include canvas representation for the tab if available
                    const contentId = content.id;
                    if (canvasRepresentations[contentId]) {
                        data += `\nCanvas Representation:\n${canvasRepresentations[contentId]}\n`;
                    }
                });

                // Copy data to clipboard
                navigator.clipboard.writeText(data).then(() => {
                    alert('Data copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy data:', err);
                });
            }

            /*
            * DESCRIPTION:
            * Updates the clock speed and rotation based on the provided duration and rotation count.
            *
            * INPUT:
            * rotation - The number of full cycles (clock hand completing 12 hours).
            * duration - The total duration in milliseconds.
            *
            * OUTPUT:
            * NONE
            */
            function updateClockSpeed(rotation, duration) {
                const clockHand = document.getElementById('clock-hand');

                if (!clockHand) return;

                const seconds = duration / 1000; // Convert duration to seconds
                const totalRotations = rotation * 360; // Total degrees to rotate based on cycles

                // Reset animation to apply changes
                clockHand.style.animation = 'none'; // Stops the current animation
                void clockHand.offsetWidth; // Triggers reflow to restart the animation
                clockHand.style.animation = `spin ${seconds}s linear infinite`;

                // Dynamically update keyframes for the specified rotation count
                const styleSheet = document.styleSheets[0]; // Assuming there's at least one stylesheet
                const existingKeyframes = Array.from(styleSheet.cssRules).find(rule => rule.name === 'spin');

                if (existingKeyframes) {
                    // Remove the old keyframes if they exist
                    styleSheet.deleteRule(Array.from(styleSheet.cssRules).indexOf(existingKeyframes));
                }

                // Add new keyframes with updated rotation
                styleSheet.insertRule(`
                    @keyframes spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(${totalRotations}deg);
                        }
                    }
                `, styleSheet.cssRules.length);

                // Stop the animation after the specified duration
                setTimeout(() => {
                    clockHand.style.animation = 'none'; // Stops the animation
                }, duration);
            }

            /*
            * DESCRIPTION:
            * Simulates a glowing effect on the movable element directly on the canvas by redrawing with a glowing
            * outline.
            *
            * INPUT:
            * duration - The total duration for the glow effect (in milliseconds).
            * clicks - The total number of clicks or glow flashes to simulate.
            *
            * OUTPUT:
            * Visually simulates multiple clicks with a glowing effect on the movable element and updates the displayed text.
            */
            function triggerGlowEffect(duration, clicks) {
                const intervals = [];

                // Randomly distribute glow events across the duration
                for (let i = 0; i < clicks; i++) {
                    const randomInterval = Math.random() * duration;
                    intervals.push(randomInterval);
                }

                // Sort intervals to ensure sequential updates
                intervals.sort((a, b) => a - b);

                intervals.forEach((interval) => {
                    setTimeout(() => {
                        // Draw glow effect
                        drawMovableElementWithGlow();

                        // Remove the glow effect after a short delay
                        setTimeout(() => {
                            drawElements();
                        }, 10);
                    }, interval);
                });
            }

            /*
            * DESCRIPTION:
            * Draws the movable element with a glowing outline.
            * This effect is simulated directly on the canvas.
            */
            function drawMovableElementWithGlow() {
                ctx.save();
                ctx.scale(canvas.width / MODEL_WIDTH, canvas.height / MODEL_HEIGHT);

                // Get the movable element's properties
                const { x, y, width, height } = movableElement;

                // Calculate the element's position and size in model units
                const elementX = x * MODEL_WIDTH - (width * MODEL_WIDTH) / 2;
                const elementY = y * MODEL_HEIGHT - (height * MODEL_HEIGHT) / 2;
                const elementWidth = width * MODEL_WIDTH;
                const elementHeight = height * MODEL_HEIGHT;

                // Draw the glowing outline
                ctx.shadowBlur = 5;         // Add shadow for the glow
                ctx.shadowColor = "blue";   // Blue glow color
                ctx.strokeStyle = "blue";   // Outline color
                ctx.lineWidth = 1;          // Outline thickness
                ctx.strokeRect(elementX, elementY, elementWidth, elementHeight); // Draw only the outline

                ctx.restore();
            }

            /*
            * DESCRIPTION:
            * Locks the canvas to prevent further movement of the movable element.
            * Disables dragging and interaction with the canvas. Unlocks automatically if a time parameter is provided.
            *
            * INPUT:
            * duration - The amount of time (in milliseconds) to lock the canvas. If not provided, the canvas remains locked indefinitely.
            *
            * OUTPUT:
            * Sets canvasLocked to true and optionally unlocks it after the specified time.
            */
            function lockCanvas(duration) {
                canvasLocked = true;
                isDragging = false;

                // Disables buttons during the lock period
                document.getElementById('post-button').disabled = true;
                document.getElementById('sample-button').disabled = true;

                // If a time parameter is provided, set a timeout to unlock the canvas
                if (duration > 0) {
                    setTimeout(() => {
                        stopTestingStatus(); // Removes the testing status text if running.
                        canvasLocked = false;

                        // Reenables the 'Post Changes' and 'Show Sample' buttons
                        document.getElementById('post-button').disabled = false;
                        document.getElementById('sample-button').disabled = false;
                    }, duration);
                }
            }

            /*
            * DESCRIPTION:
            * Initializes event listeners for user interactions.
            * Sets up handlers for buttons, canvas interactions, and window events.
            *
            * INPUT:
            * None
            *
            * OUTPUT:
            * Attaches event listeners
            */
            function initializeEventListeners() {
                // Event listener for the loading screen
                document.addEventListener("DOMContentLoaded", () => {
                    const loader = document.querySelector(".loader");

                    // Adds the 'loader-hidden' class to initiate the fade-out transition
                    loader.classList.add("loader-hidden");

                    // Generates the initial data for the user to review
                    const { samples: selectedZoneSamples, zoneIndex } = selectZoneByDistance();
                    createInitialSummary(zoneIndex);

                    // Waits for the transition to end before removing the loader from the DOM
                    loader.addEventListener("transitionend", () => {
                        loader.remove();
                    });

                    const popup = document.getElementById("initial-popup");
                    const closeButton = document.getElementById("popup-close-button");
                    const dontShowAgainCheckbox = document.getElementById("dont-show-again-checkbox");
                
                    // Checks localStorage to see if the popup should be displayed
                    if (localStorage.getItem("hidePopup") !== "true") {
                        popup.style.display = "flex";
                    }
                
                    // Closes the popup when the button is clicked
                    closeButton.addEventListener("click", () => {
                        // If the "Don't show again" checkbox is checked, store the preference in localStorage
                        if (dontShowAgainCheckbox.checked) {
                            localStorage.setItem("hidePopup", "true");
                        }
                        popup.style.display = "none";
                    });
                });

                let isScrollPopupShown = false; 

                // UPDATE | FIX
                // Rename the buttons so it's less confusing

                // Event listener for the Sample (Pilot) button
                document.getElementById('sample-button').addEventListener('click', () => {
                    if (!initialMovement){
                        const movePopup = document.getElementById('move-popup');
                        movePopup.classList.add('show');

                        // Automatically hide the popup after 5 seconds
                        setTimeout(() => {
                            movePopup.classList.remove('show');
                        }, 5000);
                    } else {
                        // Check if the user has already scrolled down
                        if ((initialMovement && !isScrollPopupShown) && 
                            (document.body.scrollHeight > document.documentElement.clientHeight && window.scrollY === 0)) {
                            const scrollPopup = document.getElementById('scroll-popup');
                    
                            // Show the popup with the slide-up animation
                            scrollPopup.classList.add('show');
                            isScrollPopupShown = true;
                    
                            // Automatically hide the popup after 5 seconds
                            setTimeout(() => {
                                scrollPopup.classList.remove('show');
                            }, 5000);
                        }
                    }
                        
                    if (spotChanged) {
                        locationCounter++;
                        sampleCounter = 0; // Reset sample counter for new location
                        spotChanged = false;
                        addTab(locationCounter);
                    }

                    const contentId = `content-${locationCounter}`;

                    // Calls createSampleSummary function
                    createSampleSummary(contentId);
                });
                
                // UPDATE | FIX
                // Rename the buttons so it's less confusing

                // Event listener for the Publish (Publish) button
                document.getElementById('post-button').addEventListener('click', () => {
                    const { samples: selectedZoneSamples, zoneIndex } = selectZoneByDistance();
                
                    if (!initialMovement) {
                        const movePopup = document.getElementById('move-popup');
                        movePopup.classList.add('show');
                
                        setTimeout(() => {
                            movePopup.classList.remove('show');
                        }, 5000);
                    } else {
                        const finalTabLabel = 'Final';
                        const finalContentId = `content-${finalTabLabel}`;
                
                        if (!document.getElementById(`tab-${finalTabLabel}`)) {
                            addTab(finalTabLabel);
                            document.getElementById(`tab-${finalTabLabel}`).textContent = finalTabLabel;
                        }
                        createPopulationSummary(finalContentId, zoneIndex);
                    }
                });


                // Event listener for the Copy button
                document.getElementById('copy-button').addEventListener('click', copyAllDataToClipboard);

                // Event listeners for canvas interaction
                const handleMove = throttle(moveElementHandler, 10);
                canvas.addEventListener('mousedown', startDrag);
                canvas.addEventListener('touchstart', startDrag, { passive: false });
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('touchmove', handleMove);
                window.addEventListener('mouseup', endDrag);
                window.addEventListener('touchend', endDrag);

                function startDrag(e) {
                    if (canvasLocked) return;
                    isDragging = true;
                    const { clientX, clientY } = e.touches ? e.touches[0] : e;
                    moveElement(clientX, clientY);
                    e.preventDefault();
                }

                // Event listener for the Reset button
                document.getElementById('reset-button').addEventListener('click', () => {
                    location.reload();
                });

                /*
                * DESCRIPTION:
                * Handles moving the movable element during drag events.
                *
                * INPUT:
                * event - The event object from mousemove or touchmove
                *
                * OUTPUT:
                * Moves the movable element if dragging
                */
                function moveElementHandler(e) {
                    if (canvasLocked || !isDragging) return;
                    const { clientX, clientY } = e.touches ? e.touches[0] : e;
                    if (clientX && clientY) {
                        moveElement(clientX, clientY);
                        spotChanged = true;
                        initialMovement = true;
                    }
                }

                function endDrag() {
                    if (isDragging) {
                        isDragging = false;
                        spotChanged = true;
                        initialMovement = true;
                    }
                }

                /*** Event listeners for resize events ***/

                // Throttles if the canvas is being resized
                window.addEventListener('resize', throttle(() => {resizeCanvas();}, 100));

                // Ensures the canvas is correctly sized on load
                document.addEventListener('DOMContentLoaded', () => {resizeCanvas();});
            }

        /*** Initialization ***/
        initializeData();           // Initialize sample and population data
        resizeCanvas();             // Set up canvas dimensions and draw elements
        initializeEventListeners(); // Set up event handlers
    })();