import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('testing foundation', () => {
  it('can render a React Native component', async () => {
    await render(<Text>Testing setup works</Text>);

    expect(screen.getByText('Testing setup works')).toBeTruthy();
  });
});
