export default class SessionManager {

    static sessionData = [];


    static roundNum;            // An int representing the current round number.
    static roundCap;            // An int representing the round limit cap.
    static moveChoiceQuality;   // A char representing the current move quality (G = good, B = bad, and N = neutral)
                                // Will implement N in the future



    constructor(data) {
        SessionManager.sessionData = data;
    }

    moveStateHandler(locationSummaryData) {


        // Compares the previous CTR (Sample or initial) to the current sample Summary CTR
        if (locationSummaryData.at(-1).ctr > locationSummaryData.at(0).ctr) {


            // ticks up the choice quality variable up for good moves
            SessionManager.moveChoiceQuality = 'G';
        }
        else if (locationSummaryData.at(-1).ctr > locationSummaryData.at(0).ctr) {

            // ticks down the choice quality variable for bad moves
            SessionManager.moveChoiceQuality = 'B';
        }

        // Runs after the player has reached the round/sample limit and prompts the user to pick the best location.
        else if (SessionManager.roundNum === SessionManager.roundCap){


        }

        // Runs after the user publishes the changes.
        else if (SessionManager.roundNum > SessionManager.roundCap){

        }

        SessionManager.roundNum ++;
}



}