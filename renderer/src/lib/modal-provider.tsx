import Account from "@/components/Account";
import ForgetPassword from "@/components/ForgotPassword";
import Login from "@/components/Login";
import Modal from "@/components/Modal";
import SignUp from "@/components/SignUp";
import WhatsNew from "@/components/WhatsNew";
import PracticeSettingsModal from "@/components/PracticeSettingsModal";
import StreakFreezePurchaseModal from "@/components/StreakFreezePurchaseModal";
import PremiumPurchaseModal from "@/components/PremiumPurchaseModal";
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
  PRACTICE_SETTINGS = "PRACTICE_SETTINGS",
  STREAK_FREEZE_PURCHASE = "STREAK_FREEZE_PURCHASE",
  PREMIUM_PURCHASE = "PREMIUM_PURCHASE",
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

      <Modal open={modal === ModalType.PRACTICE_SETTINGS} onClose={closeModal} panelClassName="relative transform rounded-2xl bg-transparent shadow-2xl transition-all my-8">
        <PracticeSettingsModal onClose={closeModal} />
      </Modal>

      <Modal open={modal === ModalType.STREAK_FREEZE_PURCHASE} onClose={closeModal} panelClassName="relative transform rounded-2xl bg-slate-900 border border-white/10 shadow-2xl transition-all my-8 w-full max-w-md mx-4">
        <StreakFreezePurchaseModal onClose={closeModal} />
      </Modal>

      <Modal open={modal === ModalType.PREMIUM_PURCHASE} onClose={closeModal} panelClassName="relative transform rounded-2xl bg-slate-900 border border-white/10 shadow-2xl transition-all my-8 w-full max-w-md mx-4">
        <PremiumPurchaseModal onClose={closeModal} />
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
