import { runAsyncDomainTests } from '../packages/domain/src/domain.test.ts';

async function main() {
  console.log('--- Running @paygate/domain Test Suite ---');
  const results = await runAsyncDomainTests();

  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.error('Test Failures:');
    for (const err of results.errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  } else {
    console.log('All domain logic tests passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

