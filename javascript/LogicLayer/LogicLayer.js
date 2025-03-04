import PresentationLayer from "../PresentationLayer/PresentationLayer.js";
import DataAccessLayer from '../DataAccessLayer/DataAccessLayer';
class LogicLayer
{
    /**
     * DESCRIPTION:
     * Initializes sample and population data for each zone.
     * Populates zones and zonePopulations objects with data.
     *
     * INPUT:
     * None
     *
     * OUTPUT:
     * Updates zones and zonePopulations with sample data
     **/
    static initializeData() {

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
    static selectZoneByDistance() {
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
    static pullSample(selectedZoneSamples) {
        if (selectedZoneSamples.length === 0) {
            console.error("No samples available for the selected zone.");
            return null;
        }
        const sampleIndex = Math.floor(Math.random() * selectedZoneSamples.length);
        return selectedZoneSamples[sampleIndex];
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
    static generateTextCanvasRepresentation() {
    const width = 80; // Width of the canvas representation
    const height = 20; // Height of the text representation

    const horizontalBorder = '+' + '-'.repeat(width - 2) + '+';
    let canvasString = horizontalBorder + '\n';

    // Builds the canvas array
    let canvasArray = Array.from({ length: height }, () => '|' + ' '.repeat(width - 2) + '|\n');

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
    static copyAllDataToClipboard() {
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
}