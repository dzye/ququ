import React from "react";
import { Check } from "lucide-react";

const PermissionCard = ({
  icon: Icon,
  title,
  description,
  granted,
  onRequest,
  buttonText = "授予权限",
}) => {
  return (
    <div className="permission-card">
      <div className="permission-card-inner">
        <div className="permission-card-main">
          <div className="permission-icon">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="permission-copy">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        {granted ? (
          <div className="permission-status permission-status-granted">
            <Check className="h-4 w-4" strokeWidth={1.8} />
            <span>已授予</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRequest}
            className="permission-action"
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

export default PermissionCard;
