const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Run git command to get contributors (name <email>)
  const output = execSync('git log --format="%an <%ae>"', { encoding: 'utf-8' });
  const lines = output.trim().split('\n');
  const uniqueContributors = [...new Set(lines)].filter(Boolean);
  
  // Parse contributors
  const contributors = uniqueContributors.map(line => {
    const match = line.match(/^([^<]+)\s*<([^>]+)>$/);
    if (match) {
      return { name: match[1].trim(), email: match[2].trim() };
    }
    return { name: line.trim() };
  });

  // Filter out RohitAIS as requested
  const filteredContributors = contributors.filter(c => 
    c.email !== 'rohit@amazingindianstories.com' && c.name !== 'RohitAIS'
  );

  // Map to github usernames
  const githubMapping = {
    'rohitrdc12345@gmail.com': 'RDC28',
    'sakshikolhal885@gmail.com': 'SakshiKolhal',
  };

  const formattedList = filteredContributors.map(c => {
    const username = githubMapping[c.email];
    if (username) {
      return `- **[${c.name}](https://github.com/${username})** - [@${username}](https://github.com/${username})`;
    }
    return `- **${c.name}**${c.email ? ` (${c.email})` : ''}`;
  }).join('\n');

  const readmePath = path.join(__dirname, '../README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('README.md does not exist at ' + readmePath);
    process.exit(1);
  }

  let readmeContent = fs.readFileSync(readmePath, 'utf8');

  const startTag = '<!-- START_CONTRIBUTORS -->';
  const endTag = '<!-- END_CONTRIBUTORS -->';

  const startIndex = readmeContent.indexOf(startTag);
  const endIndex = readmeContent.indexOf(endTag);

  if (startIndex !== -1 && endIndex !== -1) {
    const before = readmeContent.substring(0, startIndex + startTag.length);
    const after = readmeContent.substring(endIndex);
    const newContent = `${before}\n\n${formattedList}\n\n${after}`;
    fs.writeFileSync(readmePath, newContent, 'utf8');
    console.log('Successfully updated contributors in README.md!');
  } else {
    console.error('Contributors tags <!-- START_CONTRIBUTORS --> and <!-- END_CONTRIBUTORS --> not found in README.md');
  }
} catch (error) {
  console.error('Error updating contributors:', error.message);
  process.exit(1);
}
