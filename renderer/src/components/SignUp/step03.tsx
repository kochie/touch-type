import Button from "../Button";

export default function Step03({onClose}) {
    return (
        <div>
            <p>Thanks, your account is setup and ready to go!</p>
            <Button onClick={onClose} >Nice
                </Button>
        </div>
    )
}