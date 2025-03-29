"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Phone } from "lucide-react";

const phoneFormSchema = z.object({
  phone: z.string().min(10, { message: "Номер телефона должен содержать не менее 10 цифр" }),
});

type PhoneFormValues = z.infer<typeof phoneFormSchema>;

interface PhoneFormProps {
  onSubmit: (values: { phone: string }) => Promise<void>;
  isLoading: boolean;
}

export function PhoneForm({ onSubmit, isLoading }: PhoneFormProps) {
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: "",
    },
  });

  const handleSubmit = async (values: PhoneFormValues) => {
    await onSubmit(values);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Вход в систему</CardTitle>
        <CardDescription>
          Введите номер телефона для получения кода подтверждения
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер телефона</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <div className="flex items-center bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input">
                        <span>+</span>
                      </div>
                      <Input 
                        placeholder="9989XXXXXXXX" 
                        className="rounded-l-none" 
                        type="tel"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Отправка..." : "Получить код"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Вам будет отправлен код подтверждения
        </p>
      </CardFooter>
    </Card>
  );
} 