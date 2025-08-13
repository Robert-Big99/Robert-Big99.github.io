import * as LogicLayer from '../LogicLayer/LogicLayer.js';
import DataAccessLayer from '../DataAccessLayer/DataAccessLayer.js';

default class PresentationLayer
{
// Use the class
    DataAccessLayer = new DataAccessLayer();

        // Canvas Images
        const backgroundImage = 'images/Algebra_Website.png';
        static movableElementImage = 'images/Equation_Solver.png';

        // Canvas Settings
        static MODEL_WIDTH = 960;
        static MODEL_HEIGHT = 640;

        // Canvas Elements and Context
        static canvas = document.getElementById('canvas');
        static ctx = PresentationLayer.canvas.getContext('2d');

        // Canvas Background Image
        static img = new Image();
        img.src = backgroundImage;
        img.onload = () => PresentationLayer.drawElements();
        img.onerror = () => {
            console.error('Failed to load background image.');
            // Fallback to solid background color
            PresentationLayer.drawElements();
        };

        // Movable Element Image
        static movableImg = new Image();
        movableImg.src = movableElementImage;
        movableImg.onload = () => PresentationLayer.drawElements();
        movableImg.onerror = () => {
            console.error('Failed to load movable element image.');
            // Fallback to default drawing
            PresentationLayer.drawElements();
        };



    // Interface Elements
    const tabs = document.getElementById('tabs');
    const tabContents = document.getElementById('tab-contents');
    const rotatePrompt = document.getElementById('rotate-prompt');


    let showHiddenElements = false; // Controls the visibility of the Hidden elements
    let isDragging = false;       // Indicates if the movable element is being dragged
    let spotChanged = false;      // Indicates if the movable element's position has changed from the last placement
    let initialMovement = false;  // Indicates if the movable element's position has changed from the starting position
    let canvasLocked = false;     // Indicates if the canvas is locked (movable element is no longer movable)
    let ellipsesInterval = null;  // Stores the interval ID

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
    static adjustCanvasSettings() {
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
    static resizeCanvas() {
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
    static throttle = (func, limit) => {
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
    static toModelCoordinates(screenX, screenY) {
        const normalizedX = (screenX - leftOffset + window.scrollX) / canvasDisplayWidth;
        const normalizedY = (screenY - topOffset + window.scrollY) / canvasDisplayHeight;
    return { x: normalizedX, y: normalizedY };
}
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
    static getPosition(element) {
        const xPos = Math.round(element.x * (width - 2));
        const yPos = Math.round(element.y * (height - 1));
        return {
            xPos: Math.min(Math.max(xPos, 1), width - 3),
            yPos: Math.min(Math.max(yPos, 0), height - 1)
        };
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
    static moveElement(clientX, clientY) {
        const { x, y } = toModelCoordinates(clientX, clientY);

        // Calculates half dimensions to keep the element within [0..1]
        const halfWidth = DataAccessLayer.movableElement().width / 2;
        const halfHeight = movableElement.height / 2;

        // Ensures the movable element stays within bounds
        movableElement.x = clamp(x, halfWidth, 1 - halfWidth);
        movableElement.y = clamp(y, halfHeight, 1 - halfHeight);

        PresentationLayer.drawElements();
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
    static calculateDistance = (a, b) => {
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
    static drawElements() {
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
    hiddenElements.forEach(PresentationLayer.drawCircle); // Draws the hidden elements
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
        PresentationLayer.drawCircle(PresentationLayer.movableElement());
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
    static drawCircle(element) {
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
    static startTestingStatus(duration, type) {
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
        PresentationLayer.stopTestingStatus();
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
    static stopTestingStatus() {
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
    static showTab(tabId, contentId) {
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
    static toggleSpreadsheet(contentId, button) {
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
     * Updates the clock speed and rotation based on the provided duration and rotation count.
     *
     * INPUT:
     * rotation - The number of full cycles (clock hand completing 12 hours).
     * duration - The total duration in milliseconds.
     *
     * OUTPUT:
     * NONE
     */
    static updateClockSpeed(rotation, duration) {
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
    static triggerGlowEffect(duration, clicks) {
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
            PresentationLayer.drawMovableElementWithGlow();

            // Remove the glow effect after a short delay
            setTimeout(() => {
                PresentationLayer.drawElements();
            }, 10);
        }, interval);
    });
}

    /*
     * DESCRIPTION:
     * Draws the movable element with a glowing outline.
     * This effect is simulated directly on the canvas.
     */
    static drawMovableElementWithGlow() {
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
    static lockCanvas(duration) {
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
}