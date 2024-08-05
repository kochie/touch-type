import Account from "@/components/Account";
import ForgetPassword from "@/components/ForgotPassword";
import Login from "@/components/Login";
import Modal from "@/components/Modal";
import SignUp from "@/components/SignUp";
import WhatsNew from "@/components/WhatsNew";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  createContext,
  Suspense,
  useContext,
  useReducer,
  useState,
} from "react";

export enum ModalType {
  SIGN_IN = "SIGN_IN",
  SIGN_UP = "SIGN_UP",
  RECOVER_ACCOUNT = "RECOVER_ACCOUNT",
  ACCOUNT = "ACCOUNT",
  WHATS_NEW = "WHATS_NEW",
  NONE = "NONE",
}

const ModalContext = createContext({
  modal: ModalType.NONE,
  closeModal: () => {},
  setModal: (modal: ModalType) => {},
});

function Loading() {
  return (
    <div className="h-full">
      <div className="flex min-h-full max-h-[80vh] max-w-7xl">
        <div className="flex flex-1 flex-col justify-center mx-8 my-12">
          <div className="mx-auto w-full ">
            <div>
              <FontAwesomeIcon icon={faSpinner} spin size="lg" /> Loading
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModalController() {
  const { modal, closeModal, setModal } = useModal();

  return (
    <>
      <Modal open={modal === ModalType.SIGN_IN} onClose={closeModal}>
        <Login
          onForgetPassword={() => setModal(ModalType.RECOVER_ACCOUNT)}
          onSignUp={() => setModal(ModalType.SIGN_UP)}
          onContinue={() => closeModal()}
        />
      </Modal>

      <Modal open={modal === ModalType.RECOVER_ACCOUNT} onClose={closeModal}>
        <ForgetPassword
          onSignIn={() => setModal(ModalType.SIGN_IN)}
          onContinue={closeModal}
          onSignUp={() => setModal(ModalType.SIGN_UP)}
        />
      </Modal>

      <Modal open={modal === ModalType.SIGN_UP} onClose={closeModal}>
        <SignUp
          toSignIn={() => setModal(ModalType.SIGN_IN)}
          onClose={closeModal}
        />
      </Modal>

      <Modal open={modal === ModalType.WHATS_NEW} onClose={closeModal}>
        <WhatsNew
          onClose={() => {
            closeModal();
            sessionStorage.setItem("firstTimeOpen", "false");
          }}
        />
      </Modal>

      <Modal open={modal === ModalType.ACCOUNT} onClose={closeModal}>
        <Suspense fallback={<Loading />}>
          <Account
            onChangePassword={() => setModal(ModalType.RECOVER_ACCOUNT)}
            onError={closeModal}
            onCancel={closeModal}
          />
        </Suspense>
      </Modal>
    </>
  );
}

export function ModalProvider({ children }) {
  const [modal, setModal] = useState<ModalType>(ModalType.NONE);

  const closeModal = () => setModal(ModalType.NONE);

  return (
    <ModalContext.Provider value={{ modal, closeModal, setModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  return useContext(ModalContext);
};
