const { execSync } = require('child_process');
const fs = require('fs');

const runTest = (testFile, iterations) => {
  const commands = ['/create', '/update', '/delete'];
  const results = commands.reduce((acc, command) => {
    acc[command] = { totalTime: 0, totalPasses: 0, totalFailures: 0 };
    return acc;
  }, {});

  let successfulIterations = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      execSync(`npx jest ${testFile} --json --outputFile=result.json > NUL 2>&1`);

      // Check if result.json exists, if not create it
      if (!fs.existsSync('./result.json')) {
        fs.writeFileSync('./result.json', JSON.stringify({ testResults: [] }));
      }

      const resultJson = JSON.parse(fs.readFileSync('./result.json', 'utf8'));

      resultJson.testResults.forEach((testResult) => {
        testResult.assertionResults.forEach((assertion) => {
          commands.forEach((command) => {
            if (assertion.fullName && assertion.fullName.includes(command)) {
              if (assertion.duration) {
                results[command].totalTime += assertion.duration;
              }
              results[command].totalPasses +=
                assertion.status === 'passed' ? 1 : 0;
              results[command].totalFailures +=
                assertion.status === 'failed' ? 1 : 0;
            }
          });
        });
      });

      successfulIterations++;
    } catch (error) {
      console.error(`Error executing test iteration ${i + 1}:`, error.message);
      continue;
    }
  }

  const tableData = commands.map((command) => {
    const { totalTime, totalPasses, totalFailures } = results[command];
    const averageTime = totalTime / successfulIterations / 1000; // Convert ms to seconds
    const accuracy = (totalPasses / (totalPasses + totalFailures)) * 100;

    return {
      Command: command,
      'Average Time (s)': averageTime.toFixed(2),
      'Accuracy (%)': accuracy.toFixed(2),
      Iteration: successfulIterations,
    };
  });

  // Display table without colorization
  console.table(tableData);
};

const testFile = process.argv[2];
const iterations = parseInt(process.argv[3], 10) || 1;

runTest(testFile, iterations);