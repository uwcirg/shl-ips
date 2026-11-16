import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import MonthInputHarness from './MonthInputHarness.svelte';

// jsdom supports <input type="month">, like Chrome and Safari; browsers that don't (Firefox) get
// the month select and year field for every value.

function boundValue() {
	return screen.getByTestId('value').textContent;
}

describe('MonthInput', () => {
	it('uses a month input for year-month values', () => {
		const { container } = render(MonthInputHarness, { props: { value: '2015-01' } });
		expect(container.querySelector('input[type="month"]')).toHaveValue('2015-01');
		expect(screen.queryByLabelText('Year')).not.toBeInTheDocument();
	});

	it('shows a year-only value with the month left blank, and keeps it', () => {
		const { container } = render(MonthInputHarness, { props: { value: '2009' } });
		expect(container.querySelector('input[type="month"]')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Year')).toHaveValue('2009');
		expect(screen.getByLabelText('Month')).toHaveValue('');
		expect(boundValue()).toBe('2009');
	});

	it('adds a month to a year-only value', async () => {
		render(MonthInputHarness, { props: { value: '2009' } });
		await fireEvent.change(screen.getByLabelText('Month'), { target: { value: '03' } });
		expect(boundValue()).toBe('2009-03');
		// Still the same fields while editing
		expect(screen.getByLabelText('Year')).toHaveValue('2009');
	});

	it('takes a year without a month as a year-only date', async () => {
		// The month select and year field appear for year-only values (and in Firefox)
		const { getByLabelText, getByTestId } = render(MonthInputHarness, { props: { value: '2010' } });
		await fireEvent.input(getByLabelText('Year'), { target: { value: '1998' } });
		expect(getByTestId('value')).toHaveTextContent('1998');
		await fireEvent.change(getByLabelText('Month'), { target: { value: '07' } });
		expect(getByTestId('value')).toHaveTextContent('1998-07');
		await fireEvent.change(getByLabelText('Month'), { target: { value: '' } });
		expect(getByTestId('value')).toHaveTextContent('1998');
	});

	it('is empty until the year has four digits', async () => {
		const { getByLabelText, getByTestId } = render(MonthInputHarness, { props: { value: '2010' } });
		await fireEvent.input(getByLabelText('Year'), { target: { value: '19' } });
		expect(getByTestId('value')).toHaveTextContent(/^$/);
	});
});
