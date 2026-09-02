import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { makeStore } from '../store';
import AuthModal from '../components/auth/AuthModal';
import { openAuthModal } from '../store/uiSlice';
import { MOCK_OTP } from '../api';

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

  it('does not advance on an email that cannot be one', async () => {
    const { store } = openModal();

    await userEvent.type(screen.getByLabelText('Email address'), 'rider@');
    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));

    expect(await screen.findByText(/does not look like an email address/i)).toBeInTheDocument();
    expect(store.getState().auth.stage).toBe('identify');
  });

  it('does not send a code for an empty field', async () => {
    const { store } = openModal();

    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));

    expect(await screen.findByText(/Enter your email address/i)).toBeInTheDocument();
    expect(store.getState().auth.stage).toBe('identify');
  });

  it('submits on Enter', async () => {
    openModal();

    await userEvent.type(screen.getByLabelText('Email address'), 'rider@deliveroo.co{Enter}');

    expect(await screen.findByLabelText('6-digit code')).toBeInTheDocument();
  });
});

describe('creating an account', () => {
  const switchToSignUp = async () => {
    const result = openModal();
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    return result;
  };

  it('asks for a name and consent that sign-in does not', async () => {
    openModal();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));

    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('holds the submit until the terms are accepted', async () => {
    const { store } = await switchToSignUp();

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@deliveroo.co');
    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));

    expect(await screen.findByText(/Tick the box to continue/i)).toBeInTheDocument();
    expect(store.getState().auth.stage).toBe('identify');
  });

  it('stores the name on the new account once the code checks out', async () => {
    const { store } = await switchToSignUp();

    await userEvent.type(screen.getByLabelText('Full name'), 'Ada Lovelace');
    await userEvent.type(screen.getByLabelText('Email address'), 'ada@deliveroo.co');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));

    await userEvent.type(await screen.findByLabelText('6-digit code'), MOCK_OTP);
    await userEvent.click(screen.getByRole('button', { name: /Verify and continue/ }));

    await waitFor(() => expect(store.getState().auth.user?.name).toBe('Ada Lovelace'));
    expect(await screen.findByText('Account created')).toBeInTheDocument();
  });
});

describe('verifying a code', () => {
  const reachVerifyStage = async () => {
    const result = openModal();
    await userEvent.type(screen.getByLabelText('Email address'), 'rider@deliveroo.co');
    await userEvent.click(screen.getByRole('button', { name: /Continue with email/ }));
    await screen.findByLabelText('6-digit code');
    return result;
  };

  it('surfaces the rejection of a wrong code', async () => {
    const { store } = await reachVerifyStage();

    await userEvent.type(screen.getByLabelText('6-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify and continue/ }));

    expect(await screen.findByText(/that code is not right/i)).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });

  it('holds the resend behind a cooldown', async () => {
    await reachVerifyStage();

    const resend = screen.getByRole('button', { name: /Resend in \d+s/ });
    expect(resend).toBeDisabled();
  });

  it('goes back to the address without losing the dialog', async () => {
    const { store } = await reachVerifyStage();

    await userEvent.click(screen.getByRole('button', { name: /Use a different email/ }));

    expect(await screen.findByLabelText('Email address')).toBeInTheDocument();
    expect(store.getState().ui.authModal.open).toBe(true);
  });
});

describe('an already-signed-in visitor', () => {
  it('is offered a way on rather than a second sign-in form', async () => {
    const store = makeStore();
    store.dispatch({
      type: 'auth/verifyOtp/fulfilled',
      payload: { id: 'u1', name: 'Ada Lovelace', email: 'ada@deliveroo.co' }
    });
    store.dispatch(openAuthModal(null));

    render(
      <Provider store={store}>
        <MemoryRouter>
          <AuthModal />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText(/already signed in/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(store.getState().auth.user).toBeNull());
  });
});
