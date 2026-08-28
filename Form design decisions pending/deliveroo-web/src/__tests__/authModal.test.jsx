import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import AuthModal from '../components/auth/AuthModal';
import { openAuthModal } from '../store/uiSlice';

const openModal = () => {
  const store = makeStore();
  store.dispatch(openAuthModal(null));
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <AuthModal />
        </MemoryRouter>
      </Provider>
    )
  };
};

beforeEach(() => {
  localStorage.clear();
});

// §12 regression: the dialog re-renders on every keystroke, because the identifier
// lives in the store. If the focus effect re-runs with it, focus lands back on the
// close button and only the first character of anything ever gets typed.
describe('auth modal', () => {
  it('keeps focus in the field across a whole typed identifier', async () => {
    openModal();
    const field = screen.getByLabelText('Email address');

    await userEvent.type(field, 'rider@deliveroo.co');

    expect(field).toHaveValue('rider@deliveroo.co');
    expect(field).toHaveFocus();
  });

  it('focuses the field on open rather than the close button', () => {
    openModal();
    expect(screen.getByLabelText('Email address')).toHaveFocus();
  });

  it('keeps focus in the code field across a whole typed OTP', async () => {
    openModal();

    await userEvent.type(screen.getByLabelText('Email address'), 'rider@deliveroo.co');
    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));

    const code = await screen.findByLabelText('6-digit code');
    await userEvent.type(code, '123456');

    expect(code).toHaveValue('123456');
    expect(code).toHaveFocus();
  });

  it('still closes on Escape after the identifier has been retyped', async () => {
    const { store } = openModal();

    await userEvent.type(screen.getByLabelText('Email address'), 'rider@deliveroo.co');
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(store.getState().ui.authModal.open).toBe(false));
  });
});
