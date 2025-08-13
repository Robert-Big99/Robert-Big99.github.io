class QuizPopupManager {

    static instance;

    static locationNum;
    static locationCap;
    static moveChoiceQuality;

    static GOOD_MOVE_REFLECTION_MSG = [
        "Nice job!",
        "Good pick!",
        "Looking good so far!",
    ];

    static BAD_MOVE_REFLECTION_MSG  = [
        "Uh, oh...",
        "Not looking good so far..."
    ];

    static FINAL_MOVE_WARNING_MSG = [
        "On the last stretch!",
        "Time to start wrapping up!"
    ];

    static FINAL_MOVE_REFLECTION_MSG  = [
        "Now let's consider what we learned!"
    ];

    constructor() {
        if (QuizPopupManager.instance) return QuizPopupManager.instance;
        QuizPopupManager.instance = this;

        QuizPopupManager.locationNum = 0;
        QuizPopupManager.moveChoiceQuality = 0;
        QuizPopupManager.locationCap = 3;

        this.popupWindow = document.createElement('div');
        this.popupTitle = document.createElement('h2');
        this.popupContent = document.createElement('p');
        this.popupAcknowledgeButton = document.createElement('button');

        this.popupWindow.append(this.popupTitle, this.popupContent, this.popupAcknowledgeButton);
        this.popupAcknowledgeButton.textContent = "OK";

        document.body.appendChild(this.popupWindow);
    }

    moveResultPopup(locationSummaryData) {
        // Increment only after popup is acknowledged
        QuizPopupManager.locationNum++;

        this.popupWindow.style.display = 'block';
        const currentSummary = locationSummaryData.at(-1);
        const previousSummary = locationSummaryData.at(-2);

        // === Stage 1: Good/Bad message ===
        if (currentSummary.ctr >= previousSummary.ctr) {
            this.popupTitle.textContent =
                QuizPopupManager.GOOD_MOVE_REFLECTION_MSG[
                    Math.floor(Math.random() * QuizPopupManager.GOOD_MOVE_REFLECTION_MSG.length)
                    ];
            this.popupContent.textContent = `It seems that location ${QuizPopupManager.locationNum} is performing better, but it has only been used by ${currentSummary.size} visitors. Use a significance test at the 0.05 level, a 90% confidence interval, or both, to compare your pilot’s click through rates to the original location.`;
            QuizPopupManager.moveChoiceQuality = 'G';
        } else {
            this.popupTitle.textContent =
                QuizPopupManager.BAD_MOVE_REFLECTION_MSG[
                    Math.floor(Math.random() * QuizPopupManager.BAD_MOVE_REFLECTION_MSG.length)
                    ];
            this.popupContent.textContent = `It seems that location ${QuizPopupManager.locationNum} is performing worse, but it has only been used by ${currentSummary.size} visitors. Use a significance test at the 0.05 level, a 90% confidence interval, or both, to compare your pilot’s click through rates to the original location.`;
            QuizPopupManager.moveChoiceQuality = 'B';
        }

        const testButton = document.getElementById('test-button');
        if (testButton) testButton.style.visibility = 'hidden';

        return new Promise(resolve => {
            let stage = 1; // Track which popup we're on

            this.popupAcknowledgeButton.addEventListener('click', () => {
                if (stage === 1 && QuizPopupManager.locationNum >= QuizPopupManager.locationCap) {
                    // === Stage 2: Final message ===
                    if (QuizPopupManager.locationNum === QuizPopupManager.locationCap) {
                        this.popupTitle.textContent =
                            QuizPopupManager.FINAL_MOVE_WARNING_MSG[
                                Math.floor(Math.random() * QuizPopupManager.FINAL_MOVE_WARNING_MSG.length)
                                ];
                        this.popupContent.textContent = `Now that you have results from ${QuizPopupManager.locationNum} pilot locations, if you are familiar with two-sample significance tests or confidence intervals for the difference between two sample proportions, use these methods to determine which pilot location performs better by comparing the pilots between each other. If not, use your intuition to choose the best pilot. Then select the corresponding sample and publish your updates to the website.`;
                    } else {
                        this.popupTitle.textContent =
                            QuizPopupManager.FINAL_MOVE_REFLECTION_MSG[
                                Math.floor(Math.random() * QuizPopupManager.FINAL_MOVE_REFLECTION_MSG.length)
                                ];
                        this.popupContent.textContent = `Now that the new website design has been published for a month, reflect on your decision regarding the new location for the equation solver. Was your recommendation to adopt or not to adopt an error?`;
                    }
                    stage = 2; // Move to final stage
                } else {
                    // Close after final popup
                    this.popupWindow.style.display = 'none';
                    if (testButton) testButton.style.visibility = 'visible';
                    resolve();
                }
            });
        });
    }

}

export default new QuizPopupManager();
