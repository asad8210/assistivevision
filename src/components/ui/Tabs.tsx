import React, { useState, ReactNode, isValidElement, cloneElement } from 'react';

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: ReactNode;
}

interface TabsListProps {
  className?: string;
  children: ReactNode;
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  activeTab?: string;
}

export function Tabs({ defaultValue, className = '', children }: TabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  return (
    <div className={className} data-active-tab={activeTab}>
      {React.Children.map(children, child => {
        if (isValidElement(child)) {
          return cloneElement(child as React.ReactElement<any>, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ className = '', children }: TabsListProps) {
  return <div className={`flex ${className}`}>{children}</div>;
}

export function TabsTrigger({
  value,
  className = '',
  children,
  activeTab,
  setActiveTab,
}: TabsTriggerProps) {
  return (
    <button
      onClick={() => setActiveTab?.(value)}
      className={`px-4 py-2 rounded-lg transition-colors ${
        activeTab === value
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 hover:bg-gray-200'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  activeTab,
  children,
}: TabsContentProps) {
  if (value !== activeTab) return null;
  return <div>{children}</div>;
}
