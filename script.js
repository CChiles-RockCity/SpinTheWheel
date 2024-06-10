// Function to fetch the max number from the .txt file
async function getMaxNumber() {
    try {
        const response = await fetch('maxNumber.txt');
        const text = await response.text();
        return parseInt(text.trim(), 10);
    } catch (error) {
        console.error('Error fetching max number:', error);
        return null;
    }
}

// Function to generate a random number up to a max value
function getRandomNumber(max) {
    return Math.floor(Math.random() * max) + 1;
}

document.addEventListener('DOMContentLoaded', async () => {
    const maxNumber = await getMaxNumber();
    if (!maxNumber) {
        document.getElementById('random-number').textContent = 'Error loading max number';
        return;
    }

    const randomNumberSpan = document.getElementById('random-number');
    let intervalId;
    let generating = false;

    function startGeneratingRandomNumbers() {
        intervalId = setInterval(() => {
            randomNumberSpan.textContent = getRandomNumber(maxNumber);
        }, 50); // Change number every 100 milliseconds
        generating = true;
    }

    function stopGeneratingRandomNumbers() {
        clearInterval(intervalId);
        generating = false;
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (generating) {
                stopGeneratingRandomNumbers();
            } else {
                startGeneratingRandomNumbers();
            }
        }
    });
});
