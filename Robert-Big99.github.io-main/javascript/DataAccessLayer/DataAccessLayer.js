class DataAccessLayer
{
    // Hidden and Movable Elements
    // NOTE: Coordinates for hidden and movable elements are normalized to being between (0 and 1)
    static hiddenElements = [
        { x: 0.85, y: 0.6, radius: 0.025, color: '#ff0000' },
        { x: 0.1, y: 0.3, radius: 0.025, color: '#ff0000' }
    ];
    static movableElement = { x: 0.9, y: 0.3, width: 0.1, height: 0.05, color: '#00ff00' };

    /*
        * NOTE:
        * Depending on the placement of the hidden zones, not all areas
        * may be used due to how the proximity factor is calculated in
        * the selectZoneByDistance function.
        */
    // FIX | MODIFY -> try to rewrite the proximity factor
    static zoneData = [
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

    static sampleNum = 30;   // Number of samples per zone
    static sampleSize = 150;  // Sample size (reduced as requested)
    static sampleVar = 100;  // The variability of the sample size (Acts as a upper bound)

}
export default class DataAccessLayer {
    // Class implementation
}